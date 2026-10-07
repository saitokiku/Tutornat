'use client';

// /tutor: the tutor's workspace, profile/onboarding, availability, upcoming
// sessions (join the call, mark complete), and earnings. Any signed-in user can
// onboard as a tutor; an admin flips them to "active" so students can find them.
//
// Restyled onto the one system (docs/superpowers/specs/2026-08-22-one-system-rebuild.md):
// the hand-written header is ui/AppHeader (same hrefs, same measure as the body),
// the page shell is ui/Section, the titled groups are ui/Card, the four figures
// at the top are ui/Stat, refusals go to ui/Notice in the error channel, and
// every arbitrary text-[Npx] / rounded-[Npx] is back on the shared scales. Join,
// Add slot, Save and Create are the ink pill, like every other primary action in
// the product. Every figure the page asserts is mono with tabular numerals.
//
// Behavior is untouched. In particular: earnings come FROM THE LEDGER and are
// never recomputed client-side; ProfileEditor initializes from the tutor row so
// a background refresh cannot clobber in-progress edits; the prep brief lazily
// loads and caches unless the previous result errored, and renders both the
// prose and the structured concept block with its legend; the non-active status
// band and the public-profile band both stay.
//
// Wave 2 reorders it around the room (docs/superpowers/specs/2026-09-02-wave2-geometry.md).
// "Your rooms" now leads, because running tonight's room and writing its exit
// ratings is the only work on this page that is time-critical, and it used to
// sit fourth — under two payout figures and a public-profile editor. Nothing is
// deleted: the stats, the profile, the availability grid and the 1:1 list all
// stay, in the order of how often the Director actually needs them.

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { supabase, cloudConfigured, authedFetch } from '@/lib/supabaseClient';
import { useHistoryLayer } from '@/lib/historyNav';
import VideoCall from '@/components/VideoCall';
import TutorObserve from '@/components/TutorObserve';
import TutorClasses from '@/components/TutorClasses';
import { money as moneyFmt, when } from '@/lib/format';
import { IconCheck, IconArrowRight, IconBook, IconSpark } from '@/components/Icons';
import AppHeader from '@/components/ui/AppHeader';
import Section from '@/components/ui/Section';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Notice from '@/components/ui/Notice';
import Field from '@/components/ui/Field';
import Stat from '@/components/ui/Stat';
import { TUTOR_PAY, formatPrice } from '@/lib/server/clubPricing';

// Markdown renderer (brief + recap) is lazy so it never weighs down /tutor.
const MessageBody = dynamic(() => import('@/components/MessageBody'), {
  ssr: false, loading: () => <span className="text-xs text-muted">…</span>,
});

const money = (cents) => moneyFmt(cents, { decimals: 2 });

// The pay range, from the pricing source of truth rather than typed here.
const PAY_RANGE = `${formatPrice(TUTOR_PAY.minCents)} to ${formatPrice(TUTOR_PAY.maxCents)} an hour`;

export default function TutorPage() {
  const [authed, setAuthed] = useState(null);
  const [tutor, setTutor] = useState(null);
  const [slots, setSlots] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [earnings, setEarnings] = useState({ accrued: 0, paid: 0 });
  const [call, setCall] = useState(null);
  const [msg, setMsg] = useState('');

  // onboarding form
  const [name, setName] = useState('');
  const [headline, setHeadline] = useState('');
  const [bio, setBio] = useState('');
  const [subjects, setSubjects] = useState('');
  // new slot
  const [slotStart, setSlotStart] = useState('');
  const [slotLen, setSlotLen] = useState('60');

  // Back closes the call overlay instead of leaving the workspace.
  useHistoryLayer(Boolean(call), useCallback(() => setCall(null), []), 'call');

  const loadAll = useCallback(async () => {
    const [availRes, sessRes, earnRes] = await Promise.all([
      authedFetch('/api/tutoring/availability'),
      authedFetch('/api/tutoring/sessions'),
      authedFetch('/api/tutor/earnings'),
    ]);
    if (availRes.ok) {
      const d = await availRes.json();
      setTutor(d.tutor || null);
      setSlots(d.slots || []);
    }
    if (sessRes.ok) {
      const d = await sessRes.json();
      setSessions(d.asTutor || []);
    }
    // Earnings come from the authoritative ledger (accrued vs actually paid),
    // not a client-side guess.
    if (earnRes.ok) {
      const e = await earnRes.json();
      setEarnings({ accrued: e.accruedCents || 0, paid: e.paidCents || 0 });
    }
  }, []);

  useEffect(() => {
    (async () => {
      if (!cloudConfigured) { setAuthed(false); return; }
      const { data } = await supabase.auth.getSession();
      if (!data?.session?.user) { setAuthed(false); return; }
      setAuthed(true);
      loadAll();
    })();
  }, [loadAll]);

  async function onboard() {
    setMsg('');
    if (!name.trim()) { setMsg('Add a display name.'); return; }
    const res = await authedFetch('/api/tutoring/tutors', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        display_name: name.trim(), bio: bio.trim(), headline: headline.trim(),
        subjects: subjects.split(',').map((s) => s.trim()).filter(Boolean),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      }),
    });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) { setMsg(d.error || 'Could not save.'); return; }
    loadAll();
  }

  async function addSlot() {
    setMsg('');
    if (!slotStart) { setMsg('Pick a start time.'); return; }
    const start = new Date(slotStart);
    const end = new Date(start.getTime() + Number(slotLen) * 60000);
    const res = await authedFetch('/api/tutoring/availability', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ start_at: start.toISOString(), end_at: end.toISOString() }),
    });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) { setMsg(d.error || 'Could not add slot.'); return; }
    setSlotStart('');
    loadAll();
  }

  async function removeSlot(id) {
    await authedFetch('/api/tutoring/availability', {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }),
    });
    loadAll();
  }

  async function setSessionStatus(id, status) {
    await authedFetch('/api/tutoring/sessions', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, status }),
    });
    loadAll();
  }

  // Earnings are loaded from the ledger in loadAll() (accrued vs paid), not a
  // client-side recompute, which previously hardcoded paid:0.

  if (authed === false) {
    return <Shell><Gate /></Shell>;
  }

  return (
    <Shell>
      <div className="space-y-6">
        <h1 className="font-brand font-semibold text-d3">Tutor workspace</h1>

        {!tutor ? (
          <Panel title="Become a Kaizen tutor">
            <div className="p-5 space-y-4">
              <p className="text-sm text-muted">Set up your profile. An admin activates you before students can book.</p>
              <Field label="Display name" value={name} onChange={(e) => setName(e.target.value)}
                placeholder="How families will see you" />
              <Field label="Headline" hint="One line, the way you would introduce yourself."
                value={headline} onChange={(e) => setHeadline(e.target.value)}
                placeholder="Patient calculus tutor, 5 years" />
              <Field label="Short bio" as="textarea" rows={3} controlClassName="resize-none"
                value={bio} onChange={(e) => setBio(e.target.value)}
                placeholder="What a family should know before booking you" />
              <Field label="Subjects" hint="Comma separated."
                value={subjects} onChange={(e) => setSubjects(e.target.value)}
                placeholder="Algebra 2, Chemistry, SAT Math" />
              <p className="text-xs text-muted leading-relaxed">
                Kaizen sets the session prices families see. You are paid a flat hourly rate
                (<b className="font-opmono tabular-nums text-ink">{PAY_RANGE}</b>, agreed at hiring) for
                every session you teach: 1:1, small group, Homework Hall, and the free weekly
                Community Hall alike. Your hour is paid even when the family&apos;s membership covers
                their seat.
              </p>
              <Button onClick={onboard}>Create tutor profile</Button>
            </div>
          </Panel>
        ) : (
          <>
            {tutor.status !== 'active' && (
              <Notice kind="warn">
                Your profile is <b>{tutor.status}</b>. Every Kaizen tutor is interviewed and approved
                by our team before going live. We&apos;ll email you the screening link; you become
                bookable as soon as it clears.
              </Notice>
            )}

            {/* THE ROOM COMES FIRST. This panel was fourth, under two payout
                figures and a profile editor, and it is the only thing on this
                page that has to be done at 8:40 PM with a room emptying out:
                take the register, write the exit ratings. The payout figures
                are read once a fortnight and the public profile once. Order by
                how often the person needs it, not by how the page grew. */}
            <Panel title="Your rooms">
              <TutorClasses />
            </Panel>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatCard label="Status" value={<span className="capitalize">{tutor.status}</span>} />
              <StatCard label="Awaiting payout" value={money(earnings.accrued)} />
              <StatCard label="Paid out" value={money(earnings.paid)} />
              <StatCard label="Upcoming" value={sessions.filter((s) => s.status === 'scheduled').length} />
            </div>

            {tutor.status === 'active' && tutor.slug && (
              <a href={`/tutors/${tutor.slug}`} target="_blank" rel="noreferrer"
                className="flex items-center justify-between gap-3 rounded-sm border border-good/30 bg-good/10 px-4 py-3 text-sm text-ink transition-colors hover:border-good/70">
                <span>Your public profile is live at <b className="font-opmono">/tutors/{tutor.slug}</b></span>
                <span className="inline-flex items-center gap-1.5 font-semibold shrink-0">
                  View <IconArrowRight size={14} />
                </span>
              </a>
            )}

            <ProfileEditor tutor={tutor} onSaved={loadAll} />

            <Panel title="Your availability">
              <div className="flex flex-wrap items-end gap-3 border-b border-border p-4">
                <label className="flex flex-col gap-1.5">
                  <span className="k-label">Start</span>
                  <input type="datetime-local" value={slotStart} onChange={(e) => setSlotStart(e.target.value)}
                    className="k-input w-auto px-3 py-2 font-opmono text-sm tabular-nums" />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="k-label">Length</span>
                  <select value={slotLen} onChange={(e) => setSlotLen(e.target.value)}
                    className="k-input w-auto px-3 py-2 text-sm">
                    {['30', '45', '60', '90'].map((m) => <option key={m} value={m}>{m} min</option>)}
                  </select>
                </label>
                <Button size="sm" onClick={addSlot}>Add slot</Button>
              </div>
              <div className="divide-y divide-border">
                {slots.map((s) => (
                  <div key={s.id} className="flex items-center gap-3 px-4 py-3">
                    <span className="flex-1 font-opmono text-sm tabular-nums">{when(s.start_at)}</span>
                    <span className={`k-badge ${s.status === 'open' ? 'k-badge-good' : 'k-badge-muted'}`}>{s.status}</span>
                    {s.status === 'open' && (
                      <button onClick={() => removeSlot(s.id)}
                        className="text-xs text-muted hover:text-bad transition-colors">Remove</button>
                    )}
                  </div>
                ))}
                {slots.length === 0 && <Empty>No slots yet. Add times students can book.</Empty>}
              </div>
            </Panel>

            <Panel title="1:1 sessions">
              <div className="divide-y divide-border">
                {sessions.map((s) => (
                  <TutorSessionCard key={s.id} s={s} onJoin={() => setCall(s)} onStatus={setSessionStatus} />
                ))}
                {sessions.length === 0 && <Empty>No booked sessions yet.</Empty>}
              </div>
            </Panel>
          </>
        )}

        {/* Every message this page sets is a refusal, so it renders in the error
            channel. A failure painted green reads as a confirmation. */}
        <Notice kind="bad">{msg}</Notice>
      </div>

      {call && <VideoCall sessionId={call.id} title={`Session with ${call.studentName}`} onClose={() => { setCall(null); loadAll(); }} />}
    </Shell>
  );
}

export function SessionRow({ s, counterpart, onJoin, onStatus, isTutor }) {
  const soon = new Date(s.scheduled_start).getTime() - Date.now() < 15 * 60000;
  const joinable = ['scheduled', 'in_progress'].includes(s.status) && soon;
  return (
    <div className="flex items-center gap-3 px-4 py-3.5">
      <div className="flex-1 min-w-0">
        <div className="truncate text-sm font-semibold text-ink">{s.subject || s.concept || 'Tutoring session'} · {counterpart}</div>
        <div className="mt-1 text-xs text-muted">
          <span className="font-opmono tabular-nums">{when(s.scheduled_start)}</span> · {s.status}
        </div>
      </div>
      {joinable && <Button size="sm" onClick={onJoin}>Join</Button>}
      {isTutor && s.status === 'in_progress' && (
        <button onClick={() => onStatus(s.id, 'completed')}
          className="rounded-full border border-good/30 bg-good/10 px-3 py-1.5 text-xs font-semibold text-good transition-colors hover:border-good/70">
          Complete
        </button>
      )}
      {['scheduled', 'in_progress'].includes(s.status) && (
        <button onClick={() => onStatus(s.id, 'cancelled')}
          className="text-xs text-muted hover:text-bad transition-colors">Cancel</button>
      )}
    </div>
  );
}

// Edit an existing tutor profile: photo (public avatars bucket), headline,
// bio, subjects. Pricing is house-set (clubPricing.js) and pay is an admin-set
// hourly rate, so neither is editable here. Initializes from the tutor row so
// a background refresh never clobbers in-progress edits.
function ProfileEditor({ tutor, onSaved }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(tutor.display_name || '');
  const [headline, setHeadline] = useState(tutor.headline || '');
  const [bio, setBio] = useState(tutor.bio || '');
  const [subjects, setSubjects] = useState((tutor.subjects || []).join(', '));
  const [photoUrl, setPhotoUrl] = useState(tutor.photo_url || '');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  async function uploadPhoto(file) {
    if (!file) return;
    setMsg(''); setBusy(true);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const uid = sess?.session?.user?.id;
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().slice(0, 5);
      const path = `${uid}/avatar_${Date.now()}.${ext}`;
      const up = await supabase.storage.from('avatars').upload(path, file, { upsert: true, contentType: file.type });
      if (up.error) { setMsg(`Photo upload failed: ${up.error.message}`); setBusy(false); return; }
      const url = supabase.storage.from('avatars').getPublicUrl(path).data.publicUrl;
      setPhotoUrl(url);
    } catch (e) { setMsg(e.message || 'Upload failed.'); }
    setBusy(false);
  }

  async function save() {
    setMsg('');
    if (!name.trim()) { setMsg('A display name is required.'); return; }
    setBusy(true);
    const res = await authedFetch('/api/tutoring/tutors', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        display_name: name.trim(), headline: headline.trim(), bio: bio.trim(),
        subjects: subjects.split(',').map((s) => s.trim()).filter(Boolean),
        photo_url: photoUrl,
        timezone: tutor.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
      }),
    });
    const d = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { setMsg(d.error || 'Could not save.'); return; }
    setMsg('Saved');
    onSaved?.();
  }

  return (
    <Panel title="Your public profile">
      <div className="px-4 py-4">
        {!open ? (
          <button onClick={() => setOpen(true)}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-accent hover:text-ink transition-colors">
            Edit profile and photo <IconArrowRight size={14} />
          </button>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              {photoUrl
                ? <img src={photoUrl} alt="" className="w-14 h-14 rounded-md object-cover" />
                : <span className="w-14 h-14 rounded-md bg-accent/10 text-accent flex items-center justify-center font-brand font-semibold text-t2">
                    {(name || '?').trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() || '').join('')}
                  </span>}
              <label className="text-sm font-semibold text-accent hover:text-ink transition-colors cursor-pointer">
                {photoUrl ? 'Change photo' : 'Upload photo'}
                <input type="file" accept="image/*" className="hidden" onChange={(e) => uploadPhoto(e.target.files?.[0])} />
              </label>
            </div>
            <Field label="Display name" value={name} onChange={(e) => setName(e.target.value)}
              placeholder="How families will see you" />
            <Field label="Headline" value={headline} onChange={(e) => setHeadline(e.target.value)}
              placeholder="Patient calculus tutor, 5 years" />
            <Field label="Bio" as="textarea" rows={3} controlClassName="resize-none"
              value={bio} onChange={(e) => setBio(e.target.value)}
              placeholder="What a family should know before booking you" />
            <Field label="Subjects" hint="Comma separated."
              value={subjects} onChange={(e) => setSubjects(e.target.value)}
              placeholder="Algebra 2, Chemistry, SAT Math" />
            <p className="text-xs text-muted leading-relaxed">
              Your pay rate:{' '}
              <b className="font-opmono tabular-nums text-ink">
                {tutor.pay_rate_cents ? `${formatPrice(tutor.pay_rate_cents)} an hour` : 'set with your Kaizen contact at hiring'}
              </b>
              . Session prices shown to families are set by Kaizen.
            </p>
            <div className="flex items-center gap-3">
              <Button onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Save profile'}</Button>
              <button onClick={() => setOpen(false)} className="text-sm text-muted hover:text-ink transition-colors">Close</button>
              {msg && (
                <span className={`inline-flex items-center gap-1 text-xs ${msg.startsWith('Saved') ? 'text-good' : 'text-bad'}`}>
                  {msg.startsWith('Saved') && <IconCheck size={13} />}{msg}
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </Panel>
  );
}

// A session row plus the AI copilot: an on-demand pre-session prep brief and a
// post-session "polish & send" recap (expands rough notes, emails student + parents).
function TutorSessionCard({ s, onJoin, onStatus }) {
  const [brief, setBrief] = useState(null);      // null | 'loading' | markdown | 'error'
  const [engine, setEngine] = useState(null);    // structured snapshot behind the prose
  const [showBrief, setShowBrief] = useState(false);
  const [notes, setNotes] = useState('');
  const [recap, setRecap] = useState(s.recap_md || '');
  const [recapBusy, setRecapBusy] = useState(false);
  const [recapMsg, setRecapMsg] = useState('');

  async function loadBrief() {
    const opening = !showBrief;
    setShowBrief(opening);
    if (!opening || (brief && brief !== 'error')) return;
    setBrief('loading');
    const r = await authedFetch(`/api/tutoring/brief?sessionId=${s.id}`);
    const d = await r.json().catch(() => ({}));
    setBrief(r.ok ? (d.brief || 'error') : 'error');
    if (r.ok) setEngine(d.engine || null);
  }

  async function sendRecap() {
    setRecapMsg(''); setRecapBusy(true);
    const r = await authedFetch('/api/tutoring/recap', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: s.id, notes }),
    });
    const d = await r.json().catch(() => ({}));
    setRecapBusy(false);
    if (!r.ok) { setRecapMsg(d.error || 'Could not send.'); return; }
    setRecap(d.recap); setRecapMsg(`Sent to ${d.emailed} recipient${d.emailed === 1 ? '' : 's'}.`);
  }

  const canRecap = s.status === 'completed' || s.status === 'in_progress';

  return (
    <div>
      <SessionRow s={s} counterpart={s.studentName} onJoin={onJoin} onStatus={onStatus} isTutor />
      <div className="px-4 pb-3 -mt-1 flex flex-wrap gap-2">
        <button onClick={loadBrief} className="k-chip">
          <IconBook size={13} /> {showBrief ? 'Hide brief' : 'Prep brief'}
        </button>
      </div>

      {showBrief && (
        <div className="mx-4 mb-3 rounded-sm border border-border bg-panel2 p-3 space-y-3">
          {brief === 'loading' ? <p className="text-xs text-muted">Reading their progress…</p>
            : brief === 'error' ? <p className="text-xs text-bad">Couldn&apos;t build a brief for this student yet.</p>
            : <div className="text-sm"><MessageBody content={brief} /></div>}

          {/* The structured read. The prose above is a reading aid; these are the
              actual numbers, which used to be built and then thrown away. */}
          {engine?.available && engine.kcs?.length > 0 && (
            <div className="border-t border-border pt-3">
              <div className="k-label mb-2">
                Where they are
              </div>
              <div className="space-y-1.5">
                {engine.kcs.slice(0, 6).map((k) => (
                  <div key={k.kcId} className="flex items-center gap-2 text-xs">
                    <span className="flex-1 truncate text-ink">{k.title}</span>
                    {k.dependencyAlarm && (
                      <span title="Help demand isn't falling" className="k-badge k-badge-warn shrink-0">leaning</span>
                    )}
                    <span className="w-24 shrink-0 text-right font-opmono tabular-nums text-muted">
                      {Math.round(k.working * 100)}% w / {Math.round(k.confirmed * 100)}% c
                    </span>
                  </div>
                ))}
              </div>
              <p className="mt-2 text-xs text-muted leading-relaxed">
                <b className="font-opmono">w</b> = with help · <b className="font-opmono">c</b> = confirmed on
                their own. The gap is the work.
              </p>
            </div>
          )}
        </div>
      )}

      {canRecap && (
        <div className="mx-4 mb-3">
          {recap ? (
            <div className="rounded-sm border border-good/30 bg-good/10 p-3">
              <div className="k-label text-good mb-1.5">Recap sent to the family</div>
              <div className="text-sm"><MessageBody content={recap} /></div>
            </div>
          ) : (
            <div className="rounded-sm border border-border bg-panel2 p-3 space-y-3">
              {/* The structured read comes FIRST. The prose recap is for the
                  family; this is what reaches the learner model. */}
              <TutorObserve sessionId={s.id} />

              <div className="border-t border-border pt-3 space-y-2">
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
                placeholder="Rough notes for the family recap: what you covered, a win, what to practice…"
                className="k-input bg-panel px-3 py-2 text-sm resize-none" />
              <div className="flex items-center gap-3">
                <Button size="sm" onClick={sendRecap} disabled={recapBusy || notes.trim().length < 4}>
                  <IconSpark size={14} />{recapBusy ? 'Writing…' : 'Polish and send recap'}
                </Button>
                {recapMsg && <span className="text-xs text-muted">{recapMsg}</span>}
              </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Shell({ children }) {
  return (
    <div className="min-h-screen bg-paper text-ink">
      <AppHeader width="prose" />
      <Section as="main" width="prose" space="tight">{children}</Section>
    </div>
  );
}
function Gate() {
  return (
    <Card pad="lg" className="max-w-narrow mx-auto mt-6 text-center">
      <p className="font-brand font-semibold text-t2">Sign in required</p>
      <p className="text-sm text-muted mt-2">
        Sign in on the <Link href="/dashboard" className="text-accent underline underline-offset-2">dashboard</Link>,
        then return here to set up tutoring.
      </p>
    </Card>
  );
}
// A figure the workspace asserts: mono, tabular, label underneath.
function StatCard({ label, value }) {
  return (
    <Card variant="inset" pad="sm">
      <Stat value={value} label={label} />
    </Card>
  );
}
// A titled group. The title is the shared eyebrow recipe, so the six groups on
// this page read as one list rather than six competing headings.
function Panel({ title, children }) {
  return (
    <section>
      <h2 className="k-label mb-2 px-1">{title}</h2>
      <Card pad="none" className="overflow-hidden">{children}</Card>
    </section>
  );
}
function Empty({ children }) { return <div className="px-4 py-8 text-center text-xs text-muted">{children}</div>; }
