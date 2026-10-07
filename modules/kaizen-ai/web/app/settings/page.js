'use client';

// /settings — name, plan, family links, data export, sign out, delete account.
//
// Restyled onto the one system (docs/superpowers/specs/2026-08-22-one-system-rebuild.md):
// the hand-written header is now ui/AppHeader (settings, billing, tutor, admin and
// family each carried a near-identical copy, which is how they drifted into different
// typefaces), every arbitrary text-[Npx] and rounded-[Npx] is back on the shared
// scales, and the page reads as one settings list of ui/Card rows. Behavior is
// untouched: same hooks, same routes, same states, same strings where a policy
// document or a test names them.
//
// Ink acts, rose marks. The only non-ink action on this page is the delete pill,
// which is bad-toned on purpose.

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { supabase, cloudConfigured, authedFetch } from '@/lib/supabaseClient';
import { loadAppState, saveAppState } from '@/lib/appState';
import { loadConcepts } from '@/lib/store';
import { loadFiles } from '@/lib/files';
import { loadAllChats } from '@/lib/chatMemory';
import { IconCheck, IconArrowRight } from '@/components/Icons';
import AppHeader from '@/components/ui/AppHeader';
import AppFooter from '@/components/ui/AppFooter';
import Section from '@/components/ui/Section';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Notice from '@/components/ui/Notice';
import HeldState from '@/components/ui/HeldState';
import Stat from '@/components/ui/Stat';

// One recipe for the "go to the other surface" link that three sections carry.
const JUMP = 'inline-flex items-center gap-1.5 text-sm font-medium text-accent hover:text-ink transition-colors shrink-0';

export default function Settings() {
  const [authed, setAuthed] = useState(null);
  const [email, setEmail] = useState('');
  const [userId, setUserId] = useState(null);
  const [name, setName] = useState('');
  const [plan, setPlan] = useState('free');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [confirmText, setConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    (async () => {
      if (!cloudConfigured) { setAuthed(false); return; }
      const { data } = await supabase.auth.getSession();
      const user = data?.session?.user;
      if (!user) { setAuthed(false); return; }
      setAuthed(true);
      setEmail(user.email || '');
      setUserId(user.id);
      const { data: p } = await supabase.from('profiles').select('name,plan').eq('id', user.id).maybeSingle();
      setName(p?.name || loadAppState().profile?.name || '');
      setPlan(p?.plan || 'free');
    })();
  }, []);

  async function saveName() {
    if (saving) return;
    setSaving(true); setError(''); setSaved(false);
    try {
      const { error: err } = await supabase.from('profiles').update({ name: name.trim() }).eq('id', userId);
      if (err) throw err;
      // keep the local working copy in sync so the next cloud push agrees
      const app = loadAppState();
      saveAppState({ ...app, profile: { ...app.profile, name: name.trim() } });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setError(err.message || 'Could not save.');
    } finally {
      setSaving(false);
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
    window.location.href = '/dashboard';
  }

  const [exporting, setExporting] = useState(false);

  // Full server-side export (CCPA-style access/portability); falls back to the
  // browser's local copy only if the server route is unavailable.
  async function exportData() {
    if (exporting) return;
    setExporting(true); setError('');
    try {
      const res = await authedFetch('/api/account/export');
      let blob;
      if (res.ok) {
        blob = await res.blob();
      } else {
        const payload = {
          exportedAt: new Date().toISOString(),
          note: 'Local-device copy (server export unavailable)',
          app: loadAppState(),
          concepts: loadConcepts(),
          files: loadFiles().map(({ text, ...meta }) => ({ ...meta, text: text ? text.slice(0, 15000) : null })),
          chats: loadAllChats(),
        };
        blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      }
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `kaizen-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch (err) {
      setError(err.message || 'Export failed.');
    } finally {
      setExporting(false);
    }
  }

  async function deleteAccount() {
    if (confirmText !== 'DELETE' || deleting) return;
    setDeleting(true); setError('');
    try {
      const res = await authedFetch('/api/account/delete', { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Deletion failed.');
      try { window.localStorage.clear(); } catch { /* noop */ }
      try { await supabase.auth.signOut(); } catch { /* session already dead */ }
      window.location.href = '/';
    } catch (err) {
      setError(err.message);
      setDeleting(false);
    }
  }

  const planName = {
    free: 'Free', club: 'Club', plus: 'Plus', max: 'Max',
    student: 'AI Student (legacy)', family: 'Study Circle (legacy)', internal: 'Internal',
  }[plan] || plan;

  return (
    <div className="min-h-screen bg-paper text-ink flex flex-col">
      <AppHeader width="prose" />

      {/* One container for the whole page. The chrome was widened to the
          marketing rail so the wordmark stops drifting between routes, but the
          body stayed in the narrow column, which left the header, the body and
          the footer on three different left edges — the wordmark sat 204px to
          the left of the word "Settings" directly beneath it. The body now
          rides the same rail, and the reading measure is kept by constraining
          the column INSIDE it rather than by re-centering the page.
          When there is nothing here but the sign-in gate, that short column is
          centered in the height it has instead of floating at the top of it. */}
      <Section
        as="main"
        width="wide"
        space="tight"
        className={`flex-1 flex flex-col ${authed === false ? 'justify-center' : ''}`}
      >
        <div className="max-w-prose space-y-6">
          {/* One title size across the interior (see /billing, /family and the
              dashboard sign-in): the heading no longer shrinks twice as a
              parent walks from the marketing pages into the app. */}
          <h1 className="font-brand font-semibold text-d3 sm:text-d2">Settings</h1>

          {/* The one held-state message, in the one place every interior page
              puts it: under the title, above the first card. A parent should
              read what page they are on before they read what is closed on it.
              It replaces a demo-mode aside that pointed at a reset glyph this
              page has never rendered. */}
          {!cloudConfigured && <HeldState kind="accounts" />}

          {authed === false && (
            // The same gate /tutors/apply uses, and for the same reason: a
            // heading, one sentence, and one ink pill. The way forward was a
            // rose underline buried in running prose, which is a link, not a
            // door.
            <Card as="section" pad="lg">
              <h2 className="font-brand font-semibold text-ink text-t1">Sign in to open your settings</h2>
              <p className="mt-2 text-sm text-muted max-w-[52ch]">
                Your name, plan, family links, privacy choices, and data controls all live on
                your account.
              </p>
              {/* When accounts are held, this cannot be the loudest control on
                  the screen: the banner directly above says accounts are not
                  open, and /dashboard holds its whole sign-in form for the same
                  reason. A live pill here would send a parent to a door we
                  already told them was locked. */}
              {cloudConfigured ? (
                <Button href="/dashboard" className="mt-6">
                  Sign in or create an account
                  <IconArrowRight size={15} />
                </Button>
              ) : (
                <p className="mt-6 text-sm text-muted">
                  Nothing to do here yet. Your settings appear the moment accounts open.
                </p>
              )}
            </Card>
          )}

          {authed && (
            <>
              {/* Profile */}
              <Card as="section" className="space-y-3">
                <h2 className="k-label">Profile</h2>
                <p className="text-sm text-muted">
                  Signed in as <span className="text-ink font-medium">{email}</span>
                </p>
                <div className="flex gap-2">
                  <input
                    value={name} onChange={(e) => setName(e.target.value)}
                    placeholder="Your name" aria-label="Your name"
                    className="k-input flex-1"
                  />
                  <Button onClick={saveName} disabled={saving || !name.trim()} className="shrink-0">
                    {saving ? 'Saving…' : saved ? <>Saved<IconCheck size={14} /></> : 'Save'}
                  </Button>
                </div>
              </Card>

              {/* Plan */}
              <Card as="section">
                <h2 className="k-label">Plan</h2>
                <div className="flex items-center justify-between gap-3 mt-2">
                  <p className="font-brand font-semibold text-t2">{planName}</p>
                  <Link href="/billing" className={JUMP}>
                    Manage plan &amp; usage <IconArrowRight size={14} />
                  </Link>
                </div>
              </Card>

              {/* Age & live tutoring — only renders when there's something to do */}
              <AgeSection userId={userId} />

              {/* Family */}
              <FamilySection />

              {/* Tutoring */}
              <Card as="section">
                <h2 className="k-label">Tutoring</h2>
                <div className="flex items-center justify-between gap-3 mt-2">
                  <p className="text-sm text-muted">Tutor with Kaizen and set your availability.</p>
                  <Link href="/tutor" className={JUMP}>
                    Tutor workspace <IconArrowRight size={14} />
                  </Link>
                </div>
              </Card>

              {/* Your data */}
              <Card as="section">
                <h2 className="k-label">Your data</h2>
                <p className="text-sm text-muted mt-2">
                  One JSON file with everything Kaizen stores about you: profile, courses, chats,
                  sessions, files, and usage. See the{' '}
                  <Link href="/privacy" className="text-accent underline underline-offset-2">privacy policy</Link>{' '}
                  for your full rights (access, deletion, correction).
                </p>
                <Button onClick={exportData} disabled={exporting} variant="secondary" size="sm" className="mt-4">
                  {exporting ? 'Preparing…' : 'Download my data'}
                </Button>
              </Card>

              {/* Privacy preferences */}
              <PrivacySection userId={userId} />

              {/* Session */}
              <Card as="section">
                <h2 className="k-label">Session</h2>
                <Button onClick={signOut} variant="secondary" size="sm" className="mt-3">
                  Sign out
                </Button>
              </Card>

              {/* Danger zone. The one card the Card primitive does not cover: it is
                  the raised surface with the bad hairline instead of the neutral
                  one, so the rule is written out rather than fought with. */}
              <section className="bg-panel rounded-md border border-bad/30 shadow-soft p-6 space-y-3">
                <h2 className="k-label text-bad">Delete account &amp; data</h2>
                <p className="text-sm text-muted">
                  Permanently deletes your account, courses, assignments, mastery history, chats,
                  files, and usage records. Any active subscription is cancelled. This cannot be undone.
                </p>
                <div className="flex gap-2">
                  <input
                    value={confirmText} onChange={(e) => setConfirmText(e.target.value)}
                    placeholder='Type "DELETE" to confirm' aria-label='Type "DELETE" to confirm'
                    className="k-input flex-1 focus:border-bad focus:ring-bad/20"
                  />
                  <button
                    onClick={deleteAccount}
                    disabled={confirmText !== 'DELETE' || deleting}
                    className="inline-flex items-center justify-center gap-2 shrink-0 rounded-full bg-bad text-paper
                               px-6 py-3 text-sm font-semibold transition-[background-color,transform] duration-150
                               hover:bg-bad/90 active:scale-[0.98] disabled:opacity-30 disabled:pointer-events-none"
                  >
                    {deleting ? 'Deleting…' : 'Delete forever'}
                  </button>
                </div>
              </section>

              {error && <Notice kind="bad">{error}</Notice>}
            </>
          )}
        </div>
      </Section>

      {/* A record should close, not trail off: this page used to end at the
          card with 570px of bare background under it. */}
      <AppFooter />
    </div>
  );
}

// ── Age & live tutoring: the way out of an "unknown" age posture ─────────────
//
// Migration 0007 added profiles.birth_year as NULL to every account that
// already existed, and the guardian gate (lib/server/family.js) refuses live
// booking for anyone whose age it can't read — correctly, since a blank field
// isn't an attestation of adulthood. But nothing in the product ever asked
// those accounts for a birth year, 0011 makes the column service-role-only, and
// the guardian path wants an address they were never asked for. This panel is
// the missing door, and it is the only place in the UI that opens it.
//
// Both remedies live here because they are the same question asked twice: how
// old are you, and if the answer is "under 18", who approves. The server is the
// authority on both — POST /api/account/birth-year takes a birth year ONCE and
// refuses to overwrite one, and the guardian link has to be clicked from the
// guardian's own inbox. Nothing below unlocks anything on its own.
function AgeSection({ userId }) {
  const [p, setP] = useState(null);
  const [year, setYear] = useState('');
  const [guardianEmail, setGuardianEmail] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState('');
  // Saving an adult year settles the question, and the panel's whole job is
  // then done — but unmounting it the instant the answer lands would swallow
  // the confirmation. Stay up for the rest of the visit.
  const [justSaved, setJustSaved] = useState(false);

  useEffect(() => {
    if (!userId) return;
    supabase.from('profiles').select('birth_year,is_minor,guardian_email,guardian_consent_at')
      .eq('id', userId).maybeSingle()
      .then(({ data }) => setP(data || {}))
      .catch(() => setP({}));
  }, [userId]);

  // A UI echo of lib/server/context.js agePosture, and only that: it decides
  // whether to draw this panel. Every booking is judged server-side.
  const age = p?.birth_year == null ? null : new Date().getFullYear() - Number(p.birth_year);
  const settledAdult = age != null && age >= 18 && age <= 110 && p?.is_minor !== true;

  async function saveYear() {
    setBusy('year'); setMsg('');
    const res = await authedFetch('/api/account/birth-year', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ birthYear: Number(year.trim()) }),
    });
    const d = await res.json().catch(() => ({}));
    setBusy('');
    if (!res.ok) { setMsg(d.error || 'Could not save that.'); return; }
    setJustSaved(true);
    setP((prev) => ({ ...prev, birth_year: d.birthYear, is_minor: d.posture !== 'adult' }));
    setMsg(d.posture === 'adult'
      ? '✓ Saved. Live tutoring is unlocked for your account.'
      : '✓ Saved. You’re under 18, so live tutoring needs a parent or guardian’s approval. Add their email below.');
  }

  async function sendGuardian() {
    const email = guardianEmail.trim();
    setBusy('guardian'); setMsg('');
    const res = await authedFetch('/api/family/guardian-consent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(email ? { guardianEmail: email } : {}),
    });
    const d = await res.json().catch(() => ({}));
    setBusy('');
    if (!res.ok) { setMsg(d.error || 'Could not send.'); return; }
    setP((prev) => ({ ...prev, guardian_email: d.sentTo || prev.guardian_email }));
    setGuardianEmail('');
    setMsg(d.alreadyConsented ? '✓ Already approved.' : `✓ Approval email sent to ${d.sentTo}.`);
  }

  if (!p || (settledAdult && !justSaved)) return null;

  return (
    <Card as="section" className="space-y-3">
      <h2 className="k-label">Age &amp; live tutoring</h2>

      {settledAdult ? (
        <p className="text-sm text-muted">
          Born <span className="font-opmono tabular-nums text-ink">{p.birth_year}</span>, recorded as an
          adult, so live 1:1 video is unlocked for your account.
        </p>
      ) : p.birth_year == null ? (
        <>
          <p className="text-sm text-muted">
            We don&apos;t have your birth year. Accounts created before we started asking never gave
            us one, and we won&apos;t assume you&apos;re an adult. Live 1:1 video stays locked until we know
            whether you&apos;re an adult or a student who needs a parent or guardian&apos;s approval. You can
            tell us once; correcting it afterwards takes a support request.
          </p>
          <div className="flex gap-2">
            <input
              value={year} onChange={(e) => setYear(e.target.value.replace(/\D/g, '').slice(0, 4))}
              inputMode="numeric" placeholder="Birth year, e.g. 1998" aria-label="Birth year"
              className="k-input flex-1 font-opmono tabular-nums"
            />
            <Button onClick={saveYear} disabled={busy === 'year' || year.trim().length !== 4} className="shrink-0">
              {busy === 'year' ? 'Saving…' : 'Save'}
            </Button>
          </div>
        </>
      ) : (
        <p className="text-sm text-muted">
          Born <span className="font-opmono tabular-nums text-ink">{p.birth_year}</span>, under 18, so live
          1:1 video runs on a parent or guardian&apos;s approval.
        </p>
      )}

      {!settledAdult && (
        <div className="border-t border-border pt-4 space-y-2">
          <p className="text-sm font-medium text-ink">Parent or guardian approval</p>
          {p.guardian_consent_at ? (
            <p className="text-xs text-good">
              <IconCheck size={13} className="inline align-[-2px] mr-1" />
              Approved on{' '}
              <span className="font-opmono tabular-nums">
                {new Date(p.guardian_consent_at).toLocaleDateString()}
              </span>. Live tutoring is unlocked.
            </p>
          ) : (
            <>
              <p className="text-xs text-muted">
                {p.guardian_email
                  ? <>We have <span className="text-ink font-medium">{p.guardian_email}</span> on file. Nothing is
                      sent until you ask. We&apos;ll email them a link to approve live tutoring.</>
                  : <>Under 18? Add a parent or guardian&apos;s email and we&apos;ll send them a link to approve live
                      1:1 video. It has to be an address other than your own.</>}
              </p>
              <div className="flex gap-2">
                <input
                  value={guardianEmail} onChange={(e) => setGuardianEmail(e.target.value)}
                  type="email" placeholder={p.guardian_email ? 'Change the guardian email (optional)' : 'Parent or guardian’s email'}
                  aria-label="Parent or guardian’s email"
                  className="k-input flex-1"
                />
                <Button onClick={sendGuardian}
                  disabled={busy === 'guardian' || (!p.guardian_email && !guardianEmail.trim())}
                  variant="secondary" className="shrink-0">
                  {busy === 'guardian' ? 'Sending…' : 'Send approval email'}
                </Button>
              </div>
            </>
          )}
        </div>
      )}

      {/* A leading "✓" on the message marks success; it renders as the icon, and
          a refusal never lands in the success channel. */}
      {msg && (
        <Notice kind={msg.startsWith('✓') ? 'ok' : 'bad'}>
          {msg.startsWith('✓') && <IconCheck size={14} className="inline align-[-2px] mr-1.5 text-good" />}
          {msg.replace(/^✓\s*/, '')}
        </Notice>
      )}
    </Card>
  );
}

// ── Privacy preferences: non-essential email + analytics opt-outs ────────────
function PrivacySection({ userId }) {
  const [prefs, setPrefs] = useState(null); // { email_opt_out, analytics_opt_out }

  useEffect(() => {
    if (!userId) return;
    supabase.from('profiles').select('email_opt_out,analytics_opt_out').eq('id', userId).maybeSingle()
      .then(({ data }) => setPrefs(data || { email_opt_out: false, analytics_opt_out: false }))
      .catch(() => setPrefs({ email_opt_out: false, analytics_opt_out: false }));
  }, [userId]);

  async function toggle(key) {
    const value = !prefs?.[key];
    setPrefs((p) => ({ ...p, [key]: value }));
    await supabase.from('profiles').update({ [key]: value }).eq('id', userId);
    if (key === 'analytics_opt_out') {
      // analytics.js honors this flag locally, immediately
      try { window.localStorage.setItem('kaizen.analytics.optout', value ? '1' : ''); } catch { /* noop */ }
    }
  }

  const rows = [
    { key: 'email_opt_out', label: 'Non-essential email', desc: 'Tips and onboarding nudges. Receipts, booking confirmations, and safety notices always send.' },
    { key: 'analytics_opt_out', label: 'Product analytics', desc: 'Anonymous usage analytics that help us improve Kaizen. We never sell or share personal data.' },
  ];

  return (
    <Card as="section" className="space-y-4">
      <h2 className="k-label">Privacy preferences</h2>
      {rows.map((r) => (
        <div key={r.key} className="flex items-center gap-4">
          <div className="flex-1">
            <p className="text-sm font-medium text-ink">{r.label}</p>
            <p className="text-xs text-muted">{r.desc}</p>
          </div>
          <button onClick={() => toggle(r.key)} disabled={!prefs}
            className={`w-11 h-6 rounded-full transition-colors relative shrink-0 ${prefs && !prefs[r.key] ? 'bg-good' : 'bg-border'}`}
            title={prefs && !prefs[r.key] ? 'On. Click to opt out' : 'Off'}>
            <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-panel shadow-soft transition-transform ${prefs && !prefs[r.key] ? 'translate-x-5' : 'translate-x-0'}`} />
          </button>
        </div>
      ))}
    </Card>
  );
}

// ── Family: parent↔student linking + the parent's summary window ─────────────
function FamilySection() {
  const [links, setLinks] = useState(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [msg, setMsg] = useState('');
  const [summary, setSummary] = useState(null); // { forName, data }
  const [loadingSummary, setLoadingSummary] = useState('');

  const load = useCallback(async () => {
    const res = await authedFetch('/api/family');
    if (res.ok) setLinks((await res.json()).links);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function invite() {
    setMsg('');
    if (!inviteEmail.trim()) return;
    const res = await authedFetch('/api/family', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: inviteEmail.trim() }),
    });
    const d = await res.json().catch(() => ({}));
    setMsg(res.ok ? `✓ Invite sent to ${d.studentName}. They accept it here in Settings.` : d.error || 'Invite failed.');
    if (res.ok) { setInviteEmail(''); load(); }
  }

  async function respond(id, action) {
    setMsg('');
    const res = await authedFetch('/api/family', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, action }),
    });
    if (!res.ok) setMsg((await res.json().catch(() => ({}))).error || 'Failed.');
    load();
  }

  async function viewSummary(link) {
    setLoadingSummary(link.id);
    setSummary(null);
    const res = await authedFetch(`/api/family/summary?studentId=${encodeURIComponent(link.studentId)}`);
    setLoadingSummary('');
    if (res.ok) setSummary({ forName: link.otherName || link.otherEmail, data: await res.json() });
    else setMsg((await res.json().catch(() => ({}))).error || 'Could not load the summary.');
  }

  return (
    <Card as="section" className="space-y-3">
      {/* This section links an existing student account; /family is the other
          half of the same job — managed teen profiles, booking on their
          behalf, membership usage — and nothing in Settings used to point at
          it. Same header-link idiom as the Tutoring section below. */}
      <div className="flex items-center justify-between gap-3">
        <h2 className="k-label">Family</h2>
        <Link href="/family" className={JUMP}>
          Parent dashboard <IconArrowRight size={14} />
        </Link>
      </div>
      <p className="text-sm text-muted">
        Parents can link to a student&apos;s account to see grades and weekly reports, never
        their chats.
      </p>

      <div className="flex gap-2">
        <input
          value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && invite()}
          placeholder="Student's email" type="email" aria-label="Student's email"
          className="k-input flex-1"
        />
        <Button onClick={invite} disabled={!inviteEmail.trim()} className="shrink-0">
          Link student
        </Button>
      </div>

      {(links || []).map((l) => (
        <div key={l.id} className="k-card-sm px-4 py-3">
          <div className="flex items-center gap-2.5">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-ink truncate">{l.otherName || l.otherEmail}</p>
              <p className="text-xs text-muted">
                {l.role === 'parent' ? 'Your student' : 'Parent on your account'} · {l.status}
              </p>
            </div>
            {l.status === 'pending' && l.role === 'student' && (
              <>
                <button onClick={() => respond(l.id, 'accept')} className="shrink-0 text-xs font-semibold text-ink bg-good/15 border border-good/30 px-3 py-1.5 rounded-full transition-colors hover:bg-good/25">Accept</button>
                <button onClick={() => respond(l.id, 'decline')} className="shrink-0 text-xs font-semibold text-ink bg-bad/10 border border-bad/30 px-3 py-1.5 rounded-full transition-colors hover:bg-bad/20">Decline</button>
              </>
            )}
            {l.status === 'pending' && l.role === 'parent' && (
              <span className="text-xs text-muted shrink-0">awaiting their accept</span>
            )}
            {l.status === 'active' && l.role === 'parent' && (
              <button onClick={() => viewSummary(l)} className="shrink-0 text-xs font-semibold text-ink bg-accent/10 border border-accent/30 px-3 py-1.5 rounded-full transition-colors hover:bg-accent/20">
                {loadingSummary === l.id ? 'Loading…' : 'View summary'}
              </button>
            )}
            {l.status !== 'revoked' && (
              <button onClick={() => respond(l.id, 'revoke')} className="shrink-0 text-xs text-muted hover:text-bad transition-colors">Unlink</button>
            )}
          </div>
        </div>
      ))}
      {links && links.length === 0 && (
        <p className="text-xs text-muted">No linked accounts yet.</p>
      )}

      {summary && (
        <div className="k-card-sm px-4 py-4 space-y-3">
          <div className="flex items-baseline justify-between gap-3">
            <p className="font-brand font-semibold text-t3 text-ink truncate">{summary.forName}</p>
            <span className="k-label shrink-0">This week</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <MiniStat label="GPA" value={summary.data.gpa == null ? '—' : summary.data.gpa.toFixed(2)} />
            <MiniStat label="Streak" value={`${summary.data.streak}d`} />
            <MiniStat label="Open work" value={summary.data.openAssignments} />
          </div>
          {(summary.data.courses || []).map((c) => (
            <div key={c.name} className="flex items-center gap-2 text-xs">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ background: c.color }} />
              <span className="flex-1 text-ink truncate">{c.name}</span>
              <span className="font-opmono font-semibold tabular-nums text-ink">{c.letter || '—'}{c.percent != null ? ` · ${c.percent}%` : ''}</span>
            </div>
          ))}
          {summary.data.latestReport && (
            <details className="text-xs text-muted">
              <summary className="cursor-pointer font-medium text-ink">
                Latest weekly report (<span className="font-opmono tabular-nums">{new Date(summary.data.latestReport.at).toLocaleDateString()}</span>)
              </summary>
              <div className="mt-2 whitespace-pre-wrap leading-relaxed">{summary.data.latestReport.content}</div>
            </details>
          )}
        </div>
      )}

      {/* A leading "✓" on the message marks success; it renders as the icon, and
          a refusal never lands in the success channel. */}
      {msg && (
        <Notice kind={msg.startsWith('✓') ? 'ok' : 'bad'}>
          {msg.startsWith('✓') && <IconCheck size={14} className="inline align-[-2px] mr-1.5 text-good" />}
          {msg.replace(/^✓\s*/, '')}
        </Notice>
      )}
    </Card>
  );
}

// The record's figures, in the shared Stat primitive, boxed so a row of three
// reads as one strip.
function MiniStat({ label, value }) {
  return <Stat value={value} label={label} className="bg-panel rounded-sm py-3 px-2 text-center" />;
}
