'use client';

// /admin — operations console. Server enforces admin role on every API call;
// this page just renders what /api/admin/* returns.
//
// Restyled onto the one system (docs/superpowers/specs/2026-08-22-one-system-rebuild.md).
// This screen is denser than marketing but speaks the same language: the
// hand-written header is ui/AppHeader, the page shell is ui/Section, every
// panel is a ui/Card, every message channel is ui/Notice, and every arbitrary
// text-[Npx] / rounded-[Npx] / bg-white is back on the shared scales. Two local
// primitives replace what were ~20 hand-typed recipes: <Action> for the small
// row buttons and <Tag> for the status pills, so a new row can no longer invent
// its own padding, size or hue. Figures the console asserts — money, counts,
// percentages, times — are mono with tabular numerals, because on this screen
// they are the thing being read.
//
// Nothing behavioral moved in that pass: same hooks in the same order, same
// fetches, same routes, same optimistic updates, same confirm()/prompt()
// wording, same loading / empty / demo / signed-out / not-admin states, same
// ✓-prefix message contract (tone AND icon derive from the prefix, which is
// then stripped), and refusals still render only in the failure channel.
//
// ── Wave 2, 2026-09-02 (docs/superpowers/specs/2026-09-02-wave2-geometry.md) ──
// The console had sixteen panels and not one of them answered "what room is
// running, who is in it, did they show up". It modelled the CATALOGUE of rooms
// and never the OCCASION, its four stat cards were the AI-first product's stat
// row surviving verbatim into a business that sells evenings, and its two
// hiring panels — a twice-a-year job — sat above the weekly ones. So:
//
//   * Tonight is first, and it is the occasion: running now, still owed exit
//     ratings, next. It reads /api/admin/classes?view=tonight, which is the
//     same source of truth as the grid below and a different question.
//   * Cohorts got a panel and a route, because migration 0038 added the table
//     that makes a seat ONE object and nothing wrote it. Creating a cohort
//     creates both of its weekly evenings in one action — a seat is two
//     sessions a week, and making the Director remember to link two series is
//     the defect the table exists to remove.
//   * The panels are ordered by how often the work happens: the rooms, then
//     the money, then the people, then hiring, then the AI rails.
//   * `seat` is grantable, the switches report what the server actually did,
//     and the numbers on this screen are club numbers.

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { authedFetch, supabase } from '@/lib/supabaseClient';
import { IconCheck, IconX, IconPlus, IconRefresh, IconArrowRight } from '@/components/Icons';
import AppHeader from '@/components/ui/AppHeader';
import Section from '@/components/ui/Section';
import Card from '@/components/ui/Card';
import Notice from '@/components/ui/Notice';
import Button from '@/components/ui/Button';
import Stat from '@/components/ui/Stat';
import EmptyState from '@/components/ui/EmptyState';
import RoomCard from '@/components/ui/RoomCard';
import { CLUB_TIMEZONE, roomTime, slotWhen, zoneLabel } from '@/lib/roomTime';
import {
  TUTOR_PAY, KIND_DEFAULTS, RETAIL, DIAGNOSTIC, SALE_STATUS, forSale,
  SEAT_PLAN, CLUB_PLANS, AI_PLANS, formatPrice as dollars,
} from '@/lib/server/clubPricing';

const SWITCHES = [
  { key: 'tutor_enabled', label: 'Tutor enabled', desc: 'Master switch for all Claude tutoring' },
  { key: 'voice_enabled', label: 'Voice enabled', desc: 'TTS + Realtime token minting' },
  { key: 'expensive_models_enabled', label: 'Deep model allowed', desc: 'Off = deep-tier calls downgrade to tutor tier' },
  { key: 'maintenance_mode', label: 'Maintenance mode', desc: 'Blocks all tutor traffic with a friendly message' },
  { key: 'signups_enabled', label: 'Sign-ups open', desc: 'Off = new account creation is paused on the login page' },
  { key: 'club_enabled', label: 'Club selling open', desc: 'Master switch for the schedule, group seats, and 1:1 booking (fails closed)' },
  { key: 'diagnostic_enabled', label: 'Diagnostic on sale', desc: 'The one-time placement diagnostic only. Separate from the club switch on purpose — it is what sells first (fails closed)' },
];

const ROLES = ['student', 'parent', 'tutor', 'admin'];

// The grantable lineup, DERIVED — the same expression the route uses to decide
// what it will accept (app/api/admin/grant-plan/route.js). Both were a typed
// array until 2026-09-02, and neither had grown a `seat` key: the one recurring
// product on sale was the one plan a director could not put on an account.
// For sale first, then the retired tiers (still grantable — /terms discloses
// them and a support case may need one), then the legacy keys.
const GRANT_PLANS = [
  'free',
  ...Object.keys(SALE_STATUS).filter(forSale),
  ...Object.keys(SALE_STATUS).filter((p) => !forSale(p)),
  'student', 'family', 'internal',
];
// The names those keys carry on the price sheet, so the picker reads as the
// product rather than as a column value.
const PLAN_DEFS = { ...SEAT_PLAN, ...AI_PLANS, ...CLUB_PLANS };
function planOptionLabel(plan) {
  const label = PLAN_DEFS[plan]?.label;
  // Retired is said out loud: granting one is a support decision, not a sale.
  const retired = SALE_STATUS[plan] === 'retired' ? ' · retired' : '';
  return `${plan}${label ? ` · ${label}` : ''}${retired}`;
}

// One select recipe for the whole console. Inputs are rounded-sm, quiet fill,
// accent focus ring — the same shape k-input gives a text field.
const SELECT = 'bg-panel2 border border-border rounded-sm px-2.5 py-1.5 text-xs text-ink '
  + 'appearance-none focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20';

export default function Admin() {
  const [data, setData] = useState(null);
  const [settings, setSettings] = useState(null);
  const [error, setError] = useState('');
  const [authed, setAuthed] = useState(null);
  const [grantEmail, setGrantEmail] = useState('');
  const [grantPlan, setGrantPlan] = useState('student');
  const [grantMsg, setGrantMsg] = useState('');
  const [users, setUsers] = useState(null);
  const [userQuery, setUserQuery] = useState('');
  const [userMsg, setUserMsg] = useState('');
  const [apps, setApps] = useState(null);
  const [appMsg, setAppMsg] = useState('');
  const [tutors, setTutors] = useState(null);
  const [tutorMsg, setTutorMsg] = useState('');
  const [safety, setSafety] = useState(null);
  const [settingsMsg, setSettingsMsg] = useState('');
  const [switchBusy, setSwitchBusy] = useState('');
  // The two club numbers at the top of the page are reported up by the panels
  // that already read them, so no read happens twice on one load.
  const [tonight, setTonight] = useState(null);
  const [seatCount, setSeatCount] = useState(null);

  const load = useCallback(async () => {
    setError('');
    setSettingsMsg('');
    try {
      const [statsRes, settingsRes] = await Promise.all([
        authedFetch('/api/admin/stats'),
        authedFetch('/api/admin/settings'),
      ]);
      if (statsRes.status === 401) { setAuthed(false); return; }
      if (statsRes.status === 403) { setError('This account is not an admin.'); setAuthed(true); return; }
      setAuthed(true);
      setData(await statsRes.json());
      if (settingsRes.ok) setSettings((await settingsRes.json()).settings);
      else {
        // A switch panel that silently vanishes is worse than one that says it
        // could not be read: these are the switches that gate selling, and an
        // empty space where they were reads as "nothing to see".
        setSettings(null);
        setSettingsMsg('The kill switches could not be read, so none of them is shown. Reload; if it keeps failing, check the server logs.');
      }
    } catch (e) {
      setError(e.message || 'Failed to load.');
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Optimistic, but never silent. This flipped local state, awaited the fetch
  // and ignored the result: a 501, a 400 or an expired session left the switch
  // showing a position the server had never taken — on the switches that gate
  // selling and safety. Now the position always ends up where the SERVER is,
  // and a refusal is said out loud.
  async function toggle(key) {
    if (switchBusy) return;
    const before = settings?.[key] === true;
    const value = !before;
    setSwitchBusy(key);
    setSettingsMsg('');
    setSettings((s) => ({ ...s, [key]: value }));
    try {
      const res = await authedFetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSettings((s) => ({ ...s, [key]: before }));
        setSettingsMsg(`${d.error || `That switch did not move (HTTP ${res.status}).`} It is still ${before ? 'on' : 'off'}.`);
        return;
      }
      setSettingsMsg(`✓ ${key} is now ${value ? 'on' : 'off'}. It applies within about a minute.`);
    } catch {
      setSettings((s) => ({ ...s, [key]: before }));
      setSettingsMsg(`The network dropped that change, so nothing moved — ${key} is still ${before ? 'on' : 'off'}.`);
    } finally {
      setSwitchBusy('');
    }
  }

  async function grantPlanTo() {
    setGrantMsg('');
    if (!grantEmail.trim()) { setGrantMsg('Enter an email.'); return; }
    const res = await authedFetch('/api/admin/grant-plan', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: grantEmail.trim(), plan: grantPlan }),
    });
    const d = await res.json().catch(() => ({}));
    setGrantMsg(res.ok ? `✓ ${d.email} set to ${d.plan}` : d.error || 'Failed.');
    if (res.ok) setGrantEmail('');
  }

  async function setHandoff(id, status) {
    await authedFetch('/api/admin/handoffs', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status }),
    });
    load();
  }

  const loadUsers = useCallback(async (q = '') => {
    setUserMsg('');
    const res = await authedFetch(`/api/admin/users${q ? `?q=${encodeURIComponent(q)}` : ''}`);
    if (res.ok) setUsers((await res.json()).users);
    else setUserMsg((await res.json().catch(() => ({}))).error || 'Failed to load users.');
  }, []);

  useEffect(() => { if (authed && !data?.demo) loadUsers(); }, [authed, data, loadUsers]);

  const loadApps = useCallback(async () => {
    setAppMsg('');
    const res = await authedFetch('/api/tutoring/applications?all=1');
    if (res.ok) setApps((await res.json()).applications || []);
    else setApps([]);
  }, []);

  useEffect(() => { if (authed && !data?.demo) loadApps(); }, [authed, data, loadApps]);

  const loadTutors = useCallback(async () => {
    const res = await authedFetch('/api/admin/tutors');
    if (res.ok) setTutors((await res.json()).tutors || []);
    else setTutors([]);
  }, []);
  const loadSafety = useCallback(async () => {
    const res = await authedFetch('/api/safety/report');
    if (res.ok) setSafety((await res.json()).events || []);
    else setSafety([]);
  }, []);
  useEffect(() => { if (authed && !data?.demo) { loadTutors(); loadSafety(); } }, [authed, data, loadTutors, loadSafety]);

  async function tutorAction(id, action) {
    setTutorMsg('');
    let notes;
    if (action === 'vet') {
      notes = prompt('Record the completed check — provider + date + result (e.g. "Checkr, cleared 2026-07-11"):');
      if (!notes) return;
    }
    if (action === 'reject_vetting') {
      notes = prompt('Reason / adverse result reference:');
      if (!notes) return;
    }
    const res = await authedFetch('/api/admin/tutors', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, action, notes }),
    });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) { setTutorMsg(d.error || 'Action failed.'); return; }
    loadTutors();
  }

  async function triageSafety(id, status) {
    await authedFetch('/api/safety/report', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status }),
    });
    loadSafety();
  }

  async function decideApp(id, status) {
    setAppMsg('');
    setApps((list) => (list || []).map((a) => (a.id === id ? { ...a, status } : a)));
    const res = await authedFetch('/api/tutoring/applications', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status }),
    });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) { setAppMsg(d.error || 'Update failed.'); loadApps(); return; }
    // Approved/rejected drop out of the pipeline view on next load.
    if (status === 'approved' || status === 'rejected') loadApps();
  }

  async function viewResume(path) {
    if (!path) return;
    const { data: signed } = await supabase.storage.from('applications').createSignedUrl(path, 120);
    if (signed?.signedUrl) window.open(signed.signedUrl, '_blank', 'noopener');
    else setAppMsg('Could not open resume.');
  }

  async function setRole(userId, role) {
    setUserMsg('');
    const res = await authedFetch('/api/admin/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, role }),
    });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) { setUserMsg(d.error || 'Role change failed.'); return; }
    setUsers((u) => (u || []).map((x) => (x.id === userId ? { ...x, role } : x)));
  }

  if (authed === false) {
    return (
      <Shell>
        <Card pad="lg" className="text-center max-w-narrow mx-auto mt-10">
          <p className="font-brand font-semibold text-t2">Sign in required</p>
          <p className="text-sm text-muted mt-2">
            Sign in on the <Link href="/dashboard" className="text-accent underline underline-offset-2">dashboard</Link> with
            an admin account, then return here.
          </p>
        </Card>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="font-brand font-semibold text-d3">Operations</h1>
          <p className="text-sm text-muted mt-1.5">Internal console. The server checks admin on every call.</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {/* The funnel board is its own page, not a panel: it is the one screen
              the founder opens weekly and it answers a different question from
              everything below it. This is the only way in. */}
          <Button href="/admin/funnel" variant="secondary" size="sm">Funnel board</Button>
          <Action tone="quiet" onClick={load}>
            <IconRefresh size={13} /> Refresh
          </Action>
        </div>
      </div>

      {/* Not-an-admin (403) is a failure, not a sign-out: it lands in the red
          channel on the console itself, where the signed-out card never does. */}
      {error && <Notice kind="bad" className="mt-5">{error}</Notice>}
      {data?.demo && <Notice kind="warn" className="mt-5">{data.note}</Notice>}

      {/* Between mount and the first response this screen rendered a heading
          and then nothing at all, which on a slow connection is indistinguishable
          from a console with no data in it. */}
      {!error && (authed === null || (authed === true && !data)) && <ConsoleSkeleton />}

      {data && !data.demo && (
        <>
          {/* The four numbers this business runs on. They used to be Users,
              AI cost, Open handoffs and Open support — the AI-first product's
              stat row, kept verbatim into a business that sells rooms. Nothing
              was lost: each of those four now sits in the header of the panel
              that lists it, where it can actually be acted on. */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-7">
            <Metric
              label="Seats filled"
              value={seatCount ? `${seatCount.seatsTaken}/${seatCount.capacity}` : '—'}
            />
            <Metric label="Active cohorts" value={seatCount ? seatCount.cohorts : '—'} />
            <Metric label="Rooms today" value={tonight ? tonight.roomsToday : '—'} />
            <Metric label="Exit ratings owed" value={tonight ? tonight.ratingsOwed : '—'} />
          </div>

          {/* Tonight, first, because it is the only panel that answers the
              question the Director has at four o'clock. */}
          <TonightSection onLoad={setTonight} />

          {/* Safety triage — never quiet, and never below the fold */}
          <Panel title="Safety reports" tone="alert">
            <div className="divide-y divide-border">
              {(safety || []).map((e) => (
                <div key={e.id} className="px-5 py-3.5">
                  <div className="flex items-center gap-2.5">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${e.status === 'open' ? 'bg-bad' : 'bg-warn'}`} />
                    <span className="text-sm font-semibold">{e.kind}</span>
                    <span className="text-xs text-muted flex-1 truncate">
                      {e.metadata?.reporter_email || e.user_id || 'anonymous'} · <Num>{new Date(e.created_at).toLocaleString()}</Num>
                    </span>
                    {e.status === 'open' && (
                      <Action tone="warn" onClick={() => triageSafety(e.id, 'reviewing')}>Reviewing</Action>
                    )}
                    <Action tone="good" onClick={() => triageSafety(e.id, 'resolved')}>Resolve</Action>
                  </div>
                  {e.detail && <p className="text-sm text-ink mt-2 whitespace-pre-wrap">{e.detail.slice(0, 500)}</p>}
                  {e.tutoring_session_id && <p className="font-opmono text-xs text-muted mt-1.5">session {e.tutoring_session_id}</p>}
                </div>
              ))}
              {safety && safety.length === 0 && <Empty>No open safety reports.</Empty>}
              {safety === null && <Empty>Loading…</Empty>}
            </div>
          </Panel>

          {/* The one recurring product, as the object a family buys into.
              Above the grid because a cohort is what the grid is FOR. */}
          <CohortsSection onLoad={setSeatCount} />

          {/* The cohorts are laid out above; the families who hold a place in
              one go here. That is the order the work happens in — lay out the
              cohort, then fill it. */}
          <SeatsSection />

          {/* The drop-in grid: Halls, Clinics and the free Community Hall, plus
              the seat rooms a cohort created. */}
          <ClassesSection />

          {/* The top of the funnel: what the director sells first, and the
              report they still owe for it. */}
          <DiagnosticsSection />

          <EarningsSection />

          <BusinessMetricsSection />

          {/* People. The console's centre of gravity used to be here — two
              HIRING panels sat above the rooms, the seats and the diagnostics.
              Hiring happens twice a year; the rooms happen twice a week, so
              they trade places. */}
          {/* Users */}
          <Panel title="Users" action={<span className="k-label">{data.users} total</span>}>
            <div className="px-5 pt-4 pb-2 flex gap-2">
              <input
                value={userQuery} onChange={(e) => setUserQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && loadUsers(userQuery)}
                placeholder="Search email or name…"
                className="k-input flex-1 px-3.5 py-2 text-sm"
              />
              <Button variant="primary" size="sm" onClick={() => loadUsers(userQuery)}>Search</Button>
            </div>
            {userMsg && <div className="px-5 pb-3"><Notice kind="bad">{userMsg}</Notice></div>}
            <div className="divide-y divide-border">
              {(users || []).map((u) => (
                <div key={u.id} className="px-5 py-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{u.name || u.email}</div>
                    <div className="text-xs text-muted truncate">
                      {u.email} · {u.plan}{u.subscription_status ? ` (${u.subscription_status})` : ''} ·{' '}
                      <Num>${u.cost30d}</Num>/30d · joined <Num>{new Date(u.created_at).toLocaleDateString()}</Num>
                    </div>
                  </div>
                  <select
                    value={u.role}
                    onChange={(e) => setRole(u.id, e.target.value)}
                    className={`shrink-0 ${SELECT}`}
                  >
                    {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
              ))}
              {users && users.length === 0 && <Empty>No users match.</Empty>}
              {users === null && <Empty>Loading…</Empty>}
            </div>
          </Panel>

          {/* Tutor applications */}
          <Panel title="Tutor applications">
            {appMsg && <div className="px-5 pt-4"><Notice kind="bad">{appMsg}</Notice></div>}
            <div className="divide-y divide-border">
              {(apps || []).map((a) => (
                <div key={a.id} className="px-5 py-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="text-t3 font-semibold truncate">{a.full_name}</div>
                      <div className="text-xs text-muted truncate">
                        {a.email}{a.phone ? ` · ${a.phone}` : ''} · applied <Num>{new Date(a.created_at).toLocaleDateString()}</Num>
                      </div>
                    </div>
                    <Tag tone={a.status === 'interview' || a.status === 'reviewing' ? 'accent' : 'muted'}>{a.status}</Tag>
                  </div>

                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    {(a.subjects || []).map((s) => (
                      <span key={s} className="inline-flex items-center rounded-full bg-accent/10 text-accent text-xs font-medium px-2.5 py-0.5">{s}</span>
                    ))}
                  </div>
                  {(a.education || a.experience_years != null) && (
                    <div className="text-xs text-muted mt-2">
                      {a.education}{a.education && a.experience_years != null ? ' · ' : ''}
                      {a.experience_years != null ? `${a.experience_years} yr${a.experience_years === 1 ? '' : 's'} experience` : ''}
                    </div>
                  )}
                  {a.cover_note && <p className="text-sm text-ink mt-2.5 line-clamp-4">{a.cover_note}</p>}
                  {a.availability_note && <p className="text-xs text-muted mt-1.5">Availability: {a.availability_note}</p>}

                  <div className="flex flex-wrap items-center gap-2 mt-3.5">
                    {a.resume_path && (
                      <Action tone="quiet" onClick={() => viewResume(a.resume_path)}>
                        Resume <IconArrowRight size={12} />
                      </Action>
                    )}
                    <span className="flex-1" />
                    {['reviewing', 'interview'].map((st) => (
                      <Action key={st} tone={a.status === st ? 'selected' : 'quiet'} onClick={() => decideApp(a.id, st)}>
                        {st === 'reviewing' ? 'Reviewing' : 'Interview'}
                      </Action>
                    ))}
                    <Action tone="good" onClick={() => decideApp(a.id, 'approved')}>Approve</Action>
                    <Action tone="ghost" onClick={() => { if (confirm(`Reject ${a.full_name}'s application? They’ll be emailed a polite decline.`)) decideApp(a.id, 'rejected'); }}>
                      Reject
                    </Action>
                  </div>
                </div>
              ))}
              {apps && apps.length === 0 && <Empty>No open applications.</Empty>}
              {apps === null && <Empty>Loading…</Empty>}
            </div>
          </Panel>

          {/* Tutor roster: vetting is the child-safety control point */}
          <Panel title="Tutors · vetting and activation">
            {tutorMsg && <div className="px-5 pt-4"><Notice kind="bad">{tutorMsg}</Notice></div>}
            <div className="divide-y divide-border">
              {(tutors || []).map((t) => (
                <div key={t.id} className="px-5 py-3.5">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold truncate">{t.display_name}</div>
                      <div className="text-xs text-muted truncate">
                        {t.email || t.user_id} · joined <Num>{new Date(t.created_at).toLocaleDateString()}</Num>
                      </div>
                    </div>
                    <Tag tone={t.vetting_status === 'cleared' ? 'good' : t.vetting_status === 'rejected' ? 'bad' : 'warn'}>
                      {t.vetting_status === 'cleared' ? 'vetted' : t.vetting_status === 'rejected' ? 'check failed' : 'unvetted'}
                    </Tag>
                    <Tag tone={t.status === 'active' ? 'good' : 'muted'}>{t.status}</Tag>
                  </div>
                  {t.vetting_notes && (
                    <p className="text-xs text-muted mt-1.5">
                      <span className="font-opmono text-micro uppercase mr-1.5">Note</span>{t.vetting_notes}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-2 mt-2.5">
                    {t.vetting_status !== 'cleared' && (
                      <Action tone="quiet" onClick={() => tutorAction(t.id, 'vet')}>Record cleared check</Action>
                    )}
                    {t.vetting_status === 'pending' && (
                      <Action tone="ghost" onClick={() => tutorAction(t.id, 'reject_vetting')}>Record failed check</Action>
                    )}
                    {t.status !== 'active' && t.vetting_status === 'cleared' && (
                      <Action tone="good" onClick={() => tutorAction(t.id, 'activate')}>Activate for booking</Action>
                    )}
                    {t.status === 'active' && (
                      <Action tone="warn" onClick={() => tutorAction(t.id, 'pause')}>Pause and pull from marketplace</Action>
                    )}
                  </div>
                </div>
              ))}
              {tutors && tutors.length === 0 && <Empty>No tutors yet.</Empty>}
              {tutors === null && <Empty>Loading…</Empty>}
            </div>
          </Panel>


          {/* Feature usage. The 30-day AI cost used to be a stat card at the
              top of the page; it belongs here, over the features that spent it. */}
          <Panel title="Usage by feature · 30d" action={<span className="k-label">{`$${data.cost30d}`} spent</span>}>
            <div className="divide-y divide-border">
              {Object.entries(data.byFeature || {}).map(([f, q]) => (
                <div key={f} className="flex justify-between gap-4 px-5 py-3 text-sm">
                  <span className="font-opmono text-xs text-muted truncate">{f}</span>
                  <Num className="shrink-0">{Math.round(q)}</Num>
                </div>
              ))}
              {Object.keys(data.byFeature || {}).length === 0 && <Empty>No usage yet.</Empty>}
            </div>
          </Panel>

          {/* Top spenders */}
          <Panel title="Top users by est. cost · 30d">
            <div className="divide-y divide-border">
              {(data.topUsers || []).map((u) => (
                <div key={u.user_id} className="flex justify-between gap-4 px-5 py-3 text-sm">
                  <span className="font-opmono text-xs text-muted truncate">{u.user_id}</span>
                  <Num className="shrink-0">${u.usd}</Num>
                </div>
              ))}
              {(data.topUsers || []).length === 0 && <Empty>No spend yet.</Empty>}
            </div>
          </Panel>

          {/* Handoffs */}
          <Panel
            title="Human tutor requests"
            action={<span className="k-label">{(data.handoffs || []).filter((h) => h.status === 'open').length} open</span>}
          >
            <div className="divide-y divide-border">
              {(data.handoffs || []).map((h) => (
                <div key={h.id} className="px-5 py-3.5 flex items-center gap-3">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${h.status === 'open' ? 'bg-warn' : h.status === 'handled' ? 'bg-good' : 'bg-border'}`} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{h.concept || h.course_title || 'General'}</div>
                    <div className="text-xs text-muted truncate">
                      {h.urgency} · <Num>{new Date(h.created_at).toLocaleString()}</Num> · {h.note?.slice(0, 60)}
                    </div>
                  </div>
                  {h.status === 'open' && (
                    <Action tone="good" className="shrink-0" onClick={() => setHandoff(h.id, 'handled')}>
                      Mark handled
                    </Action>
                  )}
                </div>
              ))}
              {(data.handoffs || []).length === 0 && <Empty>No requests yet.</Empty>}
            </div>
          </Panel>

          {/* Support */}
          <Panel
            title="Support inbox"
            action={<span className="k-label">{(data.supports || []).filter((s) => s.status === 'open').length} open</span>}
          >
            <div className="divide-y divide-border">
              {(data.supports || []).map((s) => (
                <div key={s.id} className="px-5 py-3.5">
                  <div className="text-xs text-muted">
                    {s.email || 'anonymous'} · {s.topic} · <Num>{new Date(s.created_at).toLocaleString()}</Num>
                  </div>
                  <div className="text-sm mt-1">{s.message?.slice(0, 200)}</div>
                </div>
              ))}
              {(data.supports || []).length === 0 && <Empty>Inbox zero.</Empty>}
            </div>
          </Panel>
        </>
      )}

      {/* Grant plan */}
      {authed && !data?.demo && (
        <Panel title="Grant plan">
          <div className="px-5 py-4 space-y-3">
            <div className="flex flex-wrap gap-2">
              <input
                value={grantEmail} onChange={(e) => setGrantEmail(e.target.value)}
                placeholder="user@email.com" type="email"
                className="k-input flex-1 min-w-48 px-3.5 py-2.5 text-sm"
              />
              <select value={grantPlan} onChange={(e) => setGrantPlan(e.target.value)}
                className={`${SELECT} px-3 py-2.5 text-sm`}>
                {GRANT_PLANS.map((p) => <option key={p} value={p}>{planOptionLabel(p)}</option>)}
              </select>
              <Button variant="primary" size="sm" onClick={grantPlanTo}>Grant</Button>
            </div>
            {/* A leading "✓" on the message marks success; it renders as the
                icon and lands in the ok channel. Anything else is a refusal and
                lands in the failure channel, never painted green. */}
            {grantMsg && (
              <Notice kind={grantMsg.startsWith('✓') ? 'ok' : 'bad'}>
                {grantMsg.startsWith('✓') && <IconCheck size={13} className="inline align-[-2px] mr-1.5" />}
                {grantMsg.replace(/^✓\s*/, '')}
              </Notice>
            )}
            <p className="text-xs text-muted">
              Sets profiles.plan + subscriptions immediately (audited). Stripe-billed users should be changed
              in Stripe instead. <b>{PLAN_DEFS.seat.label}</b> is the recurring product a family pays for; the
              retired tiers are here for support cases only.
            </p>
          </div>
        </Panel>
      )}

      {/* Kill switches. The message channel is not decoration: until 2026-09-02
          this panel flipped its own state and threw the response away, so a
          refusal left the switch showing a position the server had never
          taken. */}
      {authed && !error && !data?.demo && (settings || settingsMsg) && (
        <Panel title="Kill switches · apply within about a minute">
          {settingsMsg && (
            <div className="px-5 pt-4">
              <Notice kind={settingsMsg.startsWith('✓') ? 'ok' : 'bad'}>
                {settingsMsg.startsWith('✓') && <IconCheck size={13} className="inline align-[-2px] mr-1.5" />}
                {settingsMsg.replace(/^✓\s*/, '')}
              </Notice>
            </div>
          )}
          <div className="divide-y divide-border">
            {settings && SWITCHES.map((s) => {
              const on = settings[s.key] === true;
              return (
                <div key={s.key} className="px-5 py-3.5 flex items-center gap-4">
                  <div className="flex-1">
                    <div className="text-sm font-medium" id={`switch-${s.key}`}>{s.label}</div>
                    <div className="text-xs text-muted">{s.desc}</div>
                  </div>
                  {/* A bare button whose only child is a positioning span has no
                      accessible name and no state — seven times over, on the
                      switches that gate selling. role="switch" + aria-checked is
                      the whole fix. */}
                  <button
                    type="button"
                    role="switch"
                    aria-checked={on}
                    aria-labelledby={`switch-${s.key}`}
                    aria-busy={switchBusy === s.key}
                    disabled={switchBusy !== ''}
                    onClick={() => toggle(s.key)}
                    className={`w-11 h-6 rounded-full transition-colors relative shrink-0 disabled:opacity-50
                      focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 ${on ? 'bg-good' : 'bg-border'}`}
                  >
                    <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-panel shadow-soft transition-transform ${on ? 'translate-x-5' : 'translate-x-0'}`} />
                  </button>
                </div>
              );
            })}
          </div>
        </Panel>
      )}
    </Shell>
  );
}

// ── Tonight: the occasion, not the catalogue ────────────────────────────────
// The console had sixteen panels and none of them answered "what room is
// running, who is in it, did they show up". The one room surface it had —
// Classes, below — lists the weekly TEMPLATE and its future instances, so a
// room in progress appeared on no screen at all
// (docs/superpowers/specs/2026-09-02-wave2-audit.md).
//
// This board is the evening as it actually happens: what is running, what ran
// and still owes its exit ratings, what is next. "Today" is the CLUB's day in
// the club's own zone — the server's day is UTC, where a 6 PM Austin room
// belongs to tomorrow from 7 PM onward — and every time on it is written in
// the ROOM's zone by lib/roomTime.js.
//
// It links to the tutor's console rather than doing the work here, because
// that is where the roster and the exit ratings are written and duplicating
// them would give the same room two front doors. The link only appears when
// the person reading IS the room's tutor; when they are not, the room says
// whose ratings are outstanding, which is the other half of the Director's
// evening — knowing who to call tomorrow.
function TonightSection({ onLoad }) {
  const [board, setBoard] = useState(null);
  const [msg, setMsg] = useState('');

  const load = useCallback(async () => {
    setMsg('');
    const fail = (why, seed) => {
      setBoard({ rooms: [], owed: [], timezone: seed?.timezone || CLUB_TIMEZONE, unavailable: true });
      setMsg(why);
      // The stat row must not show a confident "0 rooms" when the truth is
      // "we could not ask".
      onLoad?.(null);
    };
    try {
      const res = await authedFetch('/api/admin/classes?view=tonight');
      const d = await res.json().catch(() => ({}));
      // `unavailable` is how the board reports a failed read: it never throws,
      // it answers an EMPTY board carrying the flag. Checked here as well as on
      // the status, because a board that says nothing is on tonight and a board
      // that could not be read are the same picture — no rooms, no owed
      // ratings, two zeroes on the stat cards — and only the flag tells them
      // apart. Reading it as data was the whole defect.
      if (!res.ok || !d.tonight || d.tonight.unavailable) {
        fail(d.error || 'Today’s rooms could not be loaded.', d.tonight);
        return;
      }
      setBoard(d.tonight);
      const rooms = d.tonight.rooms || [];
      onLoad?.({
        roomsToday: rooms.filter((r) => r.phase !== 'cancelled').length,
        ratingsOwed: rooms.filter((r) => r.needsRatings).length + (d.tonight.owed || []).length,
      });
    } catch {
      fail('Today’s rooms could not be loaded.');
    }
  }, [onLoad]);
  useEffect(() => { load(); }, [load]);

  const rooms = board?.rooms || [];
  const owedBefore = board?.owed || [];
  const running = rooms.filter((r) => r.phase === 'now');
  const owedToday = rooms.filter((r) => r.phase === 'done' && r.needsRatings);
  const later = rooms.filter((r) => r.phase === 'next');
  const finished = rooms.filter((r) => r.phase === 'done' && !r.needsRatings);
  const cancelled = rooms.filter((r) => r.phase === 'cancelled');
  const nothing = board && !board.unavailable && rooms.length === 0 && owedBefore.length === 0;

  return (
    <Panel title="Tonight" bare action={
      <Action tone="quiet" onClick={load}><IconRefresh size={12} /> Reload</Action>
    }>
      <p className="text-xs text-muted px-1 mb-3">
        Today in the club&apos;s own zone (<Num>{zoneLabel(board?.timezone || CLUB_TIMEZONE)}</Num>) — the day the
        rooms are in, not the day the server is in. Exit ratings are written by the tutor who was in the room.
      </p>

      {msg && <Notice kind="bad" className="mb-3">{msg}</Notice>}
      {board?.truncated && (
        <Notice kind="warn" className="mb-3">
          More rooms ran this week than this board can hold, so the oldest unrated ones are not listed.
          Clear these and reload.
        </Notice>
      )}

      {board === null && (
        <Card pad="none" className="overflow-hidden">
          <div className="px-5 py-4"><Bar className="h-3.5 w-1/3" /><Bar className="h-3 w-2/3 mt-2" /></div>
        </Card>
      )}

      {nothing && (
        <Card pad="none" className="overflow-hidden">
          <EmptyState title="No rooms today">
            Nothing is on today’s calendar and nothing is owed from earlier in the week. Rooms come from the
            weekly grid further down this page, and only a staffed series becomes a room.
          </EmptyState>
        </Card>
      )}

      {/* Order is the order of the work: what is happening, what is owed,
          what is coming, then what is done. */}
      <RoomGroup title="Running now" rooms={running} />
      <RoomGroup title="Ran today · exit ratings not written" rooms={owedToday} tone="warn" />
      <RoomGroup title="Earlier this week · still unrated" rooms={owedBefore} tone="warn" />
      <RoomGroup title="Still to come today" rooms={later} />
      <RoomGroup title="Finished today" rooms={finished} />
      <RoomGroup title="Cancelled today" rooms={cancelled} />
    </Panel>
  );
}

function RoomGroup({ title, rooms, tone = 'default' }) {
  if (!rooms.length) return null;
  return (
    <div className="mb-4">
      <p className={`k-label mb-2 px-1 ${tone === 'warn' ? 'text-warn' : ''}`}>
        {title} · <Num>{rooms.length}</Num>
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        {rooms.map((r) => <TonightRoom key={r.id} room={r} />)}
      </div>
    </div>
  );
}

// One room, as the object it is: ui/RoomCard, so the kind badge, the venue and
// the time-in-the-room's-zone are the same here as everywhere else. What this
// screen adds is the state of the OCCASION — who is in it, whether anyone
// marked them present, and what is still owed.
function TonightRoom({ room: r }) {
  const lines = [];
  if (r.phase === 'now') {
    lines.push({
      text: `Running until ${roomTime(r.end, r.timezone)} · ${r.booked} booked`
        + (r.attendanceMarked ? `, ${r.present} marked present.` : ', nobody marked present yet.'),
    });
  } else if (r.phase === 'done') {
    if (r.booked === 0) lines.push({ text: 'Nobody was booked into this room.' });
    else if (r.needsRatings) {
      lines.push({
        tone: 'warn',
        text: r.rated === 0
          ? `No exit ratings yet — ${r.booked} student${r.booked === 1 ? '' : 's'} in the room.`
          : `Exit ratings for ${r.rated} of ${r.booked} students.`,
      });
    } else {
      lines.push({ text: `Exit ratings written for all ${r.booked}.` });
    }
  } else if (r.phase === 'cancelled') {
    lines.push({ text: 'Cancelled. Every held seat was made whole.' });
  }
  // An in-person room with no venue tells no family where to go, and an
  // unstaffed one has nobody to run it. Both are the Director's problem now,
  // not at four o'clock.
  if (!r.venue) lines.push({ tone: 'warn', text: 'No venue set on this room.' });
  if (!r.tutorName) lines.push({ tone: 'warn', text: 'No tutor on this room.' });
  else if (r.needsRatings && !r.yours) lines.push({ text: `${r.tutorName} writes these ratings; this is the call to make.` });

  return (
    <RoomCard
      kind={r.kind}
      title={r.title}
      start={r.start}
      timezone={r.timezone}
      venue={r.venue}
      tutorName={r.tutorName}
      placesLeft={r.phase === 'next' && Number.isFinite(r.capacity) ? Math.max(0, r.capacity - r.booked) : null}
      capacity={r.capacity}
      note={lines.length ? (
        <>
          {lines.map((l, i) => (
            <span key={`${i}:${l.text}`} className={`block ${i ? 'mt-1' : ''} ${l.tone === 'warn' ? 'text-warn font-semibold' : ''}`}>
              {l.text}
            </span>
          ))}
        </>
      ) : null}
      action={r.yours ? (
        <Button href="/tutor" variant="secondary" size="sm">
          Open the tutor console <IconArrowRight size={13} className="inline align-[-2px] ml-1" />
        </Button>
      ) : null}
    />
  );
}


// Manual-payout ledger (audit SHIP-006): totals per tutor, CSV export for
// bookkeeping/1099 prep, and an audited "mark paid" action.
// ── The weekly class catalog: series CRUD + instance cancellation ────────────
// A series is the template ("Algebra I Clinic · Tue 5:00 PM · drop-in price");
// the hourly cron materializes the next two weeks of rooms. Unstaffed series
// are skipped by the materializer, so laying out the grid before hiring is safe.
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
// Each label carries the kind's drop-in price so the director picks with the
// price sheet in view — INTERPOLATED from clubPricing, never typed. These two
// figures were hand-written until 2026-09-02, and the day RETAIL moved the
// picker started quoting a price the checkout would not honour (Hard Rule 2).
const KIND_OPTIONS = [
  { id: 'clinic', label: `Subject Clinic (${dollars(RETAIL.clinicSeatCents)})` },
  { id: 'homework_hall', label: `Homework Hall (${dollars(RETAIL.hallSeatCents)})` },
  { id: 'community_free', label: 'Community Hall (free)' },
  // No price on this one, and that is the point: a seat room is reserved
  // inventory. Families are put in it from the seat console, never by buying a
  // place at the door (clubPricing.groupSeatQuote answers 'reserved').
  { id: 'standing_seat', label: 'Standing seat (reserved)' },
];
// Durations the grid offers. 75 is the standing seat's length, from
// KIND_DEFAULTS rather than typed here, so the picker cannot drift from the
// product the price sheet sells.
const DURATIONS = [45, 60, KIND_DEFAULTS.standing_seat.minutes, 90];

function ClassesSection() {
  const [data, setData] = useState(null);
  const [msg, setMsg] = useState('');
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    title: '', subject: 'Math', kind: 'clinic', gradeBand: 'all', weekday: 2,
    localStartTime: '17:00', durationMinutes: 60, timezone: 'America/Chicago', tutorId: '',
    venue: '',
  });

  const load = useCallback(async () => {
    const res = await authedFetch('/api/admin/classes');
    const d = await res.json().catch(() => ({}));
    // An empty grid and a grid that could not be read look identical, and only
    // one of them means "lay out a class" — which is the action this panel puts
    // under the empty state.
    if (!res.ok) {
      setData({ series: [], tutors: [], unavailable: true });
      setMsg(d.error || 'The weekly grid could not be loaded.');
      return;
    }
    setMsg('');
    setData(d);
  }, []);
  useEffect(() => { load(); }, [load]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  // Picking a kind carries its defaults with it. The server applies these too
  // (and is the authority), but a director who never opens the duration menu
  // should see 75 minutes on the seat cohort before creating it, not discover
  // it afterwards.
  const setKind = (e) => setForm((f) => ({
    ...f,
    kind: e.target.value,
    // Mirrors the server's own default exactly (admin/classes validateSeriesPatch):
    // the kind's minutes if it has any, otherwise the plain hour.
    durationMinutes: KIND_DEFAULTS[e.target.value]?.minutes ?? 60,
  }));
  const isSeat = form.kind === 'standing_seat';

  async function create() {
    setMsg('');
    const res = await authedFetch('/api/admin/classes', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, tutorId: form.tutorId || null }),
    });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) { setMsg(d.error || 'Could not create the series.'); return; }
    setMsg('✓ Series created. Rooms materialize on the next cron tick.');
    setCreating(false);
    load();
  }

  async function patchSeries(id, patch) {
    const res = await authedFetch('/api/admin/classes', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...patch }),
    });
    const d = await res.json().catch(() => ({}));
    setMsg(res.ok ? '✓ Updated.' : d.error || 'Failed.');
    load();
  }

  async function cancelInstance(instanceId, start) {
    if (!confirm(`Cancel the ${new Date(start).toLocaleString()} room? Every held seat is refunded / its included visit returned.`)) return;
    const res = await authedFetch('/api/admin/classes', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'cancel_instance', instanceId }),
    });
    const d = await res.json().catch(() => ({}));
    setMsg(res.ok
      ? (d.failures?.length ? `⚠ Cancelled, but ${d.failures.length} refund(s) need manual settlement.` : '✓ Cancelled and made whole.')
      : d.error || 'Failed.');
    load();
  }

  const tutors = data?.tutors || [];

  return (
    <Panel
      title="Classes · weekly schedule"
      action={
        <Action tone="quiet" onClick={() => setCreating((c) => !c)}>
          {creating ? <><IconX size={12} /> Close</> : <><IconPlus size={12} /> New series</>}
        </Action>
      }
    >
      <div className="px-5 pt-4">
        <p className="text-xs text-muted">The storefront schedule. Unstaffed series don&apos;t become bookable rooms.</p>
      </div>
      {/* A leading "✓" marks success (rendered as the icon); "⚠" marks a
          partial result and stays a glyph — the icon set has no warning mark.
          Anything else is a failure and never renders in the ok channel. */}
      {msg && (
        <div className="px-5 pt-3">
          <Notice kind={msg.startsWith('✓') ? 'ok' : msg.startsWith('⚠') ? 'warn' : 'bad'}>
            {msg.startsWith('✓') && <IconCheck size={13} className="inline align-[-2px] mr-1.5" />}
            {msg.replace(/^✓\s*/, '')}
          </Notice>
        </div>
      )}

      {creating && (
        <div className="px-5 py-4 mt-3 grid grid-cols-2 gap-2 border-y border-border bg-panel2/60">
          <input value={form.title} onChange={set('title')} placeholder="Title, e.g. Algebra I Clinic"
            className="k-input col-span-2 px-3 py-2 text-sm" />
          <input value={form.subject} onChange={set('subject')} placeholder="Subject"
            className="k-input px-3 py-2 text-sm" />
          <select value={form.kind} onChange={setKind} className="k-input px-3 py-2 text-sm appearance-none">
            {KIND_OPTIONS.map((k) => <option key={k.id} value={k.id}>{k.label}</option>)}
          </select>
          <select value={form.gradeBand} onChange={set('gradeBand')} className="k-input px-3 py-2 text-sm appearance-none">
            {['all', '7-8', '9-12', 'college'].map((g) => <option key={g} value={g}>{g === 'all' ? 'All grades' : g === 'college' ? 'College' : `Grades ${g}`}</option>)}
          </select>
          <select value={form.weekday} onChange={set('weekday')} className="k-input px-3 py-2 text-sm appearance-none">
            {WEEKDAYS.map((d, i) => <option key={d} value={i}>{d}</option>)}
          </select>
          <input value={form.localStartTime} onChange={set('localStartTime')} placeholder="17:00"
            className="k-input px-3 py-2 text-sm font-opmono tabular-nums" />
          <select value={form.durationMinutes} onChange={set('durationMinutes')} className="k-input px-3 py-2 text-sm appearance-none">
            {DURATIONS.map((d) => <option key={d} value={d}>{d} min</option>)}
          </select>
          <input value={form.timezone} onChange={set('timezone')} placeholder="America/Chicago"
            className="k-input px-3 py-2 text-sm" />
          {/* Venue is a real column on every series (0033), not a seat-only
              field: NULL means the room is online. A seat is in person by
              definition, so the placeholder says so louder there. */}
          <input value={form.venue} onChange={set('venue')}
            placeholder={isSeat ? 'Venue, e.g. Cedar Park library, room B' : 'Venue (blank = online)'}
            className="k-input col-span-2 px-3 py-2 text-sm" />
          <select value={form.tutorId} onChange={set('tutorId')} className="k-input col-span-2 px-3 py-2 text-sm appearance-none">
            <option value="">Assign a tutor later</option>
            {tutors.filter((t) => t.eligible).map((t) => (
              <option key={t.id} value={t.id}>{t.name}{t.payRateSet ? '' : ' (no pay rate set!)'}</option>
            ))}
          </select>
          {/* A seat room has no price field anywhere in this console, and this
              line is why: it is reserved inventory at a fixed ratio, filled by
              enrolling a family, never by selling a place in it. */}
          {isSeat && (
            <p className="col-span-2 text-xs text-muted">
              Reserved room: up to <Num>{KIND_DEFAULTS.standing_seat.capacity}</Num> students, no drop-in price.
              Seat holders are enrolled into it and booked in weekly — nobody can buy a place at the door.
              For a NEW cohort use the Cohorts panel above: it lays out both weekly evenings at once and ties
              them together, which one series here cannot do.
            </p>
          )}
          <Button variant="primary" size="sm" block className="col-span-2" onClick={create}>Create series</Button>
        </div>
      )}

      <div className="divide-y divide-border mt-3">
        {(data?.series || []).map((s) => (
          <div key={s.id} className="px-5 py-3">
            <div className="flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">
                  {s.title}
                  {!s.active && <span className="text-muted font-normal"> · paused</span>}
                  {!s.tutor_id && <span className="text-warn font-normal"> · unstaffed</span>}
                </div>
                <div className="text-xs text-muted truncate">
                  <Num>{WEEKDAYS[s.weekday]} {String(s.local_start_time).slice(0, 5)}</Num> ({s.timezone}) · {s.kind} ·
                  {/* A seat room reads "reserved", never "free": its $0 is a
                      refusal to sell, not a giveaway. */}
                  <Num>{s.kind === 'standing_seat' ? ' reserved' : s.seat_price_cents === 0 ? ' free' : ` ${dollars(s.seat_price_cents)}`}</Num>
                  {' '}· cap <Num>{s.capacity}</Num>
                  {s.duration_minutes ? <> · <Num>{s.duration_minutes} min</Num></> : ''}
                  {s.venue ? ` · ${s.venue}` : ''}
                  {s.grade_band && s.grade_band !== 'all' ? ` · ${s.grade_band}` : ''}
                </div>
              </div>
              <select value={s.tutor_id || ''} onChange={(e) => patchSeries(s.id, { tutorId: e.target.value || null })}
                className={`${SELECT} max-w-36`}>
                <option value="">unstaffed</option>
                {tutors.filter((t) => t.eligible).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
              <Action tone={s.active ? 'warn' : 'good'} className="shrink-0"
                onClick={() => patchSeries(s.id, { active: !s.active })}>
                {s.active ? 'Pause' : 'Resume'}
              </Action>
            </div>
            {(s.upcoming || []).filter((u) => u.status !== 'cancelled').length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {s.upcoming.filter((u) => u.status !== 'cancelled').slice(0, 4).map((u) => (
                  <button key={u.id} onClick={() => cancelInstance(u.id, u.start)}
                    title="Cancel this room (refunds everyone)"
                    className="inline-flex items-center gap-1 font-opmono text-xs tabular-nums text-muted bg-panel2 border border-border px-2.5 py-1 rounded-full transition-colors hover:text-bad hover:border-bad/40">
                    {new Date(u.start).toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                    <IconX size={11} />
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
        {data && !data.unavailable && (data.series || []).length === 0 && <Empty>No series yet. Create the weekly grid above.</Empty>}
        {data === null && <Empty>Loading…</Empty>}
      </div>
    </Panel>
  );
}

// ── Cohorts: the standing seat as ONE object ────────────────────────────────
// A seat is two sessions a week (SEAT_PLAN.sessionsPerWeek) and a series is one
// weekday by construction, so laying out the one recurring product used to mean
// creating two series by hand and remembering they were halves of the same
// thing. Migration 0038 gave that rule a table; this panel and
// /api/admin/cohorts are what finally write it.
//
// Creating a cohort creates BOTH evenings in one action. That is the whole
// point: a director who creates one and forgets the other has sold a family
// two sessions a week and given them one, and nothing in the old console would
// have said so.
//
// Nothing here sells anything, so nothing here is gated by club_enabled — a
// cohort is a plan. Putting a FAMILY in one is the sale, and that is the panel
// below, which refuses while the switch is off.
const SEAT_SHAPE = KIND_DEFAULTS.standing_seat;
// The route answers which of its columns travelled onto an adopted evening.
// Column names are the right thing in the audit log and the wrong thing in a
// sentence, so the console says them in English.
const ADOPTED_FIELD = {
  title: 'title', subject: 'subject', venue: 'venue', timezone: 'timezone',
  grade_band: 'grade band', capacity: 'capacity', tutor_id: 'lead tutor',
};
const blankCohort = () => ({
  title: '', subject: 'Math', venue: '', timezone: CLUB_TIMEZONE, gradeBand: 'all',
  capacity: SEAT_SHAPE.capacity,
  leadTutorId: '',
  // The club's own pattern as the default — Tuesday and Thursday — because it
  // is what the seat is sold as. Every field is still editable.
  slots: Array.from({ length: SEAT_PLAN.seat.sessionsPerWeek }, (_, i) => ({
    weekday: [2, 4, 1, 3, 5][i] ?? 2,
    localStartTime: '16:30',
    durationMinutes: SEAT_SHAPE.minutes,
  })),
});

function CohortsSection({ onLoad }) {
  const [data, setData] = useState(null);
  const [msg, setMsg] = useState('');
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(blankCohort);
  const [editing, setEditing] = useState('');
  const [edit, setEdit] = useState(null);
  const [attach, setAttach] = useState({});
  const [busy, setBusy] = useState('');

  const load = useCallback(async () => {
    try {
      const res = await authedFetch('/api/admin/cohorts');
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        // A missing 0038 answers 503 with a sentence naming the migration.
        setData({ cohorts: [], unlinked: [], tutors: [], notProvisioned: d.notProvisioned === true });
        setMsg(d.error || 'Could not load the cohorts.');
        onLoad?.(null);
        return;
      }
      setData(d);
      const active = (d.cohorts || []).filter((c) => c.active);
      onLoad?.({
        cohorts: active.length,
        // Places, not enrolments: one student in both evenings is one seat.
        seatsTaken: active.reduce((n, c) => n + (c.seatsTaken || 0), 0),
        capacity: active.reduce((n, c) => n + (c.capacity || 0), 0),
      });
    } catch {
      setData({ cohorts: [], unlinked: [], tutors: [] });
      setMsg('Could not load the cohorts.');
      onLoad?.(null);
    }
  }, [onLoad]);
  useEffect(() => { load(); }, [load]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const setSlot = (i, k) => (e) => setForm((f) => ({
    ...f,
    slots: f.slots.map((s, j) => (j === i ? { ...s, [k]: e.target.value } : s)),
  }));

  async function create() {
    if (busy) return;
    setBusy('new'); setMsg('');
    try {
      const res = await authedFetch('/api/admin/cohorts', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          venue: form.venue.trim(),
          capacity: Number(form.capacity),
          leadTutorId: form.leadTutorId || null,
          slots: form.slots.map((s) => ({
            weekday: Number(s.weekday),
            localStartTime: s.localStartTime,
            durationMinutes: Number(s.durationMinutes),
          })),
        }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { setMsg(d.error || 'Could not create the cohort.'); return; }
      setMsg(`✓ Cohort created with ${(d.series || []).length} weekly evenings. Rooms appear on the next cron tick.`);
      setCreating(false);
      setForm(blankCohort());
      load();
    } finally { setBusy(''); }
  }

  async function patch(id, body, done) {
    if (busy) return;
    setBusy(id); setMsg('');
    try {
      const res = await authedFetch('/api/admin/cohorts', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...body }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { setMsg(d.error || 'That change did not go through.'); return; }
      // 207: the cohort moved and its evenings did not. Never green.
      setMsg(d.partial ? `⚠ ${d.message}` : `✓ ${typeof done === 'function' ? done(d) : done}`);
      setEditing(''); setEdit(null);
      load();
    } finally { setBusy(''); }
  }

  const cohorts = data?.cohorts || [];
  const unlinked = data?.unlinked || [];
  const tutors = (data?.tutors || []).filter((t) => t.eligible);

  // Why this cohort cannot adopt this evening, or '' when it can. The SERVER
  // enforces both refusals — a browser enforces nothing, and /api/admin/cohorts
  // answers 409 either way — but a console that offers an action it knows will
  // be refused teaches the director to ignore its own errors.
  const cannotAdopt = (c, u) => {
    const slots = c.slots || [];
    if (slots.length >= SEAT_PLAN.seat.sessionsPerWeek) return ' · already has every evening';
    if (slots.some((s) => Number(s.weekday) === Number(u.weekday))) return ' · already meets that night';
    return '';
  };

  return (
    <Panel title="Cohorts · the standing seat" bare action={
      <div className="flex gap-1.5">
        <Action tone={creating ? 'selected' : 'quiet'} onClick={() => { setCreating((c) => !c); setMsg(''); }}>
          {creating ? <><IconX size={12} /> Close</> : <><IconPlus size={12} /> New cohort</>}
        </Action>
        <Action tone="quiet" onClick={load}><IconRefresh size={12} /> Reload</Action>
      </div>
    }>
      <p className="text-xs text-muted px-1 mb-3">
        One object per cohort: a subject, a venue, a lead tutor, <Num>{SEAT_SHAPE.capacity}</Num> places, and the{' '}
        <Num>{SEAT_PLAN.seat.sessionsPerWeek}</Num> evenings of{' '}
        <Num>{SEAT_SHAPE.minutes} min</Num> that make it up. Creating one creates both evenings; a seat room is
        reserved inventory and never carries a door price.
      </p>

      {msg && (
        <Notice kind={msg.startsWith('✓') ? 'ok' : msg.startsWith('⚠') ? 'warn' : 'bad'} className="mb-3">
          {msg.startsWith('✓') && <IconCheck size={13} className="inline align-[-2px] mr-1.5" />}
          {msg.replace(/^✓\s*/, '')}
        </Notice>
      )}
      {data?.notProvisioned && (
        <Notice kind="warn" className="mb-3">
          Nothing is lost — no cohort has been created on this deployment yet. Apply the migration and reload.
        </Notice>
      )}

      {creating && (
        <Card pad="none" className="overflow-hidden mb-3">
          <div className="px-5 py-4 grid grid-cols-2 gap-2 bg-panel2/60">
            <input value={form.title} onChange={set('title')} placeholder="Title, e.g. Algebra I · Tue/Thu"
              className="k-input col-span-2 px-3 py-2 text-sm" />
            <input value={form.subject} onChange={set('subject')} placeholder="Subject"
              className="k-input px-3 py-2 text-sm" />
            <select value={form.gradeBand} onChange={set('gradeBand')} className="k-input px-3 py-2 text-sm appearance-none">
              {['all', '7-8', '9-12', 'college'].map((g) => (
                <option key={g} value={g}>{g === 'all' ? 'All grades' : g === 'college' ? 'College' : `Grades ${g}`}</option>
              ))}
            </select>
            <input value={form.venue} onChange={set('venue')} placeholder="Venue, e.g. Cedar Park library, room B"
              className="k-input col-span-2 px-3 py-2 text-sm" />
            <input value={form.timezone} onChange={set('timezone')} placeholder={CLUB_TIMEZONE}
              className="k-input px-3 py-2 text-sm" />
            <select value={form.leadTutorId} onChange={set('leadTutorId')} className="k-input px-3 py-2 text-sm appearance-none">
              <option value="">Assign a lead tutor later</option>
              {tutors.map((t) => (
                <option key={t.id} value={t.id}>{t.name}{t.payRateSet ? '' : ' (no pay rate set!)'}</option>
              ))}
            </select>
            {form.slots.map((slot, i) => (
              <div key={i} className="col-span-2 grid grid-cols-3 gap-2">
                <select value={slot.weekday} onChange={setSlot(i, 'weekday')} className="k-input px-3 py-2 text-sm appearance-none">
                  {WEEKDAYS.map((d, w) => <option key={d} value={w}>{d}</option>)}
                </select>
                <input value={slot.localStartTime} onChange={setSlot(i, 'localStartTime')} placeholder="16:30"
                  className="k-input px-3 py-2 text-sm font-opmono tabular-nums" />
                <select value={slot.durationMinutes} onChange={setSlot(i, 'durationMinutes')} className="k-input px-3 py-2 text-sm appearance-none">
                  {DURATIONS.map((d) => <option key={d} value={d}>{d} min</option>)}
                </select>
              </div>
            ))}
            <p className="col-span-2 text-xs text-muted">
              Both evenings are created as reserved <Num>standing_seat</Num> series at{' '}
              <Num>{SEAT_SHAPE.capacity}</Num> places. Each must be a different weekday — two rooms on one night
              is not two sessions a week. An unstaffed cohort is fine to lay out now; it materializes no rooms
              until a cleared tutor leads it.
            </p>
            <Button variant="primary" size="sm" block className="col-span-2"
              disabled={busy === 'new' || !form.title.trim() || !form.subject.trim()}
              onClick={create}>
              {busy === 'new' ? 'Creating…' : 'Create the cohort and its evenings'}
            </Button>
          </div>
        </Card>
      )}

      {data === null && (
        <Card pad="none" className="overflow-hidden">
          <div className="px-5 py-4"><Bar className="h-3.5 w-1/3" /><Bar className="h-3 w-2/3 mt-2" /></div>
        </Card>
      )}

      {data && cohorts.length === 0 && !data.notProvisioned && (
        <Card pad="none" className="overflow-hidden">
          <EmptyState
            title="No cohorts yet"
            action={<Button variant="primary" size="sm" onClick={() => setCreating(true)}>New cohort</Button>}
          >
            A cohort is what a family buys into. Create one and both weekly evenings are laid out with it.
          </EmptyState>
        </Card>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {cohorts.map((c) => (
          <div key={c.id}>
            <RoomCard
              kind="standing_seat"
              title={c.title}
              slots={c.slots}
              timezone={c.timezone}
              venue={c.venue}
              tutorName={c.leadTutorName}
              placesLeft={c.placesLeft}
              capacity={c.capacity}
              note={
                <>
                  <span className="block">
                    {c.subject || 'No subject'}{c.gradeBand && c.gradeBand !== 'all' ? ` · grades ${c.gradeBand}` : ''}
                    {' · '}<span className="font-opmono tabular-nums">{c.seatsTaken}/{c.capacity}</span> places taken
                    {c.active ? '' : ' · paused'}
                  </span>
                  {!c.venue && <span className="block mt-1 text-warn font-semibold">No venue set — nobody can be told where to go.</span>}
                  {!c.staffed && (
                    <span className="block mt-1 text-warn font-semibold">
                      {c.slots.length === 0
                        ? 'No evenings attached — this cohort makes no rooms at all.'
                        : 'An evening has no tutor, so it materializes no rooms.'}
                    </span>
                  )}
                  {c.leadTutorId && !c.leadTutorCleared && (
                    <span className="block mt-1 text-warn font-semibold">The lead tutor is not cleared and active, so no family can be told their name.</span>
                  )}
                  {/* Staffed and unnamed are different states: an adopted
                      evening keeps its own tutor when the cohort has no lead,
                      so a cohort can make rooms while every screen that renders
                      it — the storefront, the parent's page, this card — has
                      nobody to name. */}
                  {!c.leadTutorId && (
                    <span className="block mt-1 text-warn font-semibold">No lead tutor on this cohort — no family can be told who runs it.</span>
                  )}
                </>
              }
              action={
                <div className="flex flex-wrap gap-1.5">
                  <Action tone={editing === c.id ? 'selected' : 'quiet'} disabled={busy === c.id}
                    onClick={() => {
                      setMsg('');
                      setEditing((e) => (e === c.id ? '' : c.id));
                      setEdit({
                        title: c.title, subject: c.subject || '', venue: c.venue || '',
                        gradeBand: c.gradeBand || 'all', leadTutorId: c.leadTutorId || '',
                      });
                    }}>
                    {editing === c.id ? <><IconX size={12} /> Close</> : 'Edit'}
                  </Action>
                  <Action tone={c.active ? 'warn' : 'good'} disabled={busy === c.id}
                    onClick={() => patch(c.id, { active: !c.active }, c.active ? 'Cohort paused; its evenings stop making rooms.' : 'Cohort resumed.')}>
                    {c.active ? 'Pause' : 'Resume'}
                  </Action>
                </div>
              }
            />
            {editing === c.id && edit && (
              <Card pad="none" className="overflow-hidden mt-2">
                <div className="px-4 py-3 grid grid-cols-2 gap-2 bg-panel2/60">
                  <input value={edit.title} onChange={(e) => setEdit((f) => ({ ...f, title: e.target.value }))}
                    placeholder="Title" className="k-input col-span-2 px-3 py-2 text-sm" />
                  <input value={edit.subject} onChange={(e) => setEdit((f) => ({ ...f, subject: e.target.value }))}
                    placeholder="Subject" className="k-input px-3 py-2 text-sm" />
                  <select value={edit.gradeBand} onChange={(e) => setEdit((f) => ({ ...f, gradeBand: e.target.value }))}
                    className="k-input px-3 py-2 text-sm appearance-none">
                    {['all', '7-8', '9-12', 'college'].map((g) => (
                      <option key={g} value={g}>{g === 'all' ? 'All grades' : g === 'college' ? 'College' : `Grades ${g}`}</option>
                    ))}
                  </select>
                  <input value={edit.venue} onChange={(e) => setEdit((f) => ({ ...f, venue: e.target.value }))}
                    placeholder="Venue (blank = not set)" className="k-input col-span-2 px-3 py-2 text-sm" />
                  <select value={edit.leadTutorId} onChange={(e) => setEdit((f) => ({ ...f, leadTutorId: e.target.value }))}
                    className="k-input col-span-2 px-3 py-2 text-sm appearance-none">
                    <option value="">No lead tutor</option>
                    {tutors.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                    {/* A lead who has been paused or un-cleared is not in the
                        eligible list. Without this option the select would show
                        blank and saving would quietly unassign them — an edit to
                        the venue would silently take the teacher off the cohort. */}
                    {c.leadTutorId && !tutors.some((t) => t.id === c.leadTutorId) && (
                      <option value={c.leadTutorId}>Current lead · no longer cleared</option>
                    )}
                  </select>
                  <p className="col-span-2 text-xs text-muted">
                    The venue, the subject, the grade band and the lead tutor travel to both evenings. The days
                    and times do not — an evening belongs to its own series, and moving both at once is how a
                    Thursday quietly becomes a second Tuesday. Rooms already on the calendar keep what they
                    were created with.
                  </p>
                  <Button variant="primary" size="sm" block className="col-span-2" disabled={busy === c.id}
                    onClick={() => patch(c.id, {
                      title: edit.title, subject: edit.subject,
                      venue: edit.venue.trim(), gradeBand: edit.gradeBand,
                      // Only sent when it actually changed: the route refuses an
                      // un-cleared lead (rightly), and an untouched field must
                      // not be the thing that blocks a venue correction.
                      ...(edit.leadTutorId === (c.leadTutorId || '')
                        ? {} : { leadTutorId: edit.leadTutorId || null }),
                    }, 'Cohort updated, evenings and all.')}>
                    {busy === c.id ? 'Saving…' : 'Save the cohort'}
                  </Button>
                </div>
              </Card>
            )}
          </div>
        ))}
      </div>

      {unlinked.length > 0 && (
        <Card pad="none" className="overflow-hidden mt-3">
          <div className="px-5 pt-4">
            <h3 className="text-sm font-semibold text-ink">Seat rooms with no cohort</h3>
            <p className="text-xs text-muted mt-1.5">
              Standing-seat series created before cohorts existed. They still hold real families, so they are
              adopted rather than hidden: attach each one to the cohort it belongs to and the seat becomes one
              object on every screen that renders it. The cohort&apos;s title, subject, venue, grade band,
              capacity and lead tutor travel to the adopted evening — every screen renders the COHORT&apos;s for
              all of its evenings, so an adopted room that kept its own would send a family to the wrong place.
              A cohort that already has its <Num>{SEAT_PLAN.seat.sessionsPerWeek}</Num> evenings, or that already
              meets that night, is not offered.
            </p>
          </div>
          <div className="divide-y divide-border mt-3">
            {unlinked.map((u) => (
              <div key={u.id} className="px-5 py-3 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{u.title}</div>
                  <div className="text-xs text-muted truncate">
                    <Num>{slotWhen(u.weekday, u.localStartTime)}</Num>
                    {u.venue ? ` · ${u.venue}` : ' · no venue'}
                    {u.staffed ? '' : ' · unstaffed'}
                    {u.active ? '' : ' · paused'}
                  </div>
                </div>
                <select
                  value={attach[u.id] || ''}
                  onChange={(e) => setAttach((a) => ({ ...a, [u.id]: e.target.value }))}
                  className={`shrink-0 ${SELECT} max-w-40`}
                >
                  <option value="">Attach to…</option>
                  {cohorts.map((c) => {
                    const why = cannotAdopt(c, u);
                    return <option key={c.id} value={c.id} disabled={Boolean(why)}>{c.title}{why}</option>;
                  })}
                </select>
                <Action tone="good" className="shrink-0" disabled={!attach[u.id] || busy === attach[u.id]}
                  onClick={() => patch(attach[u.id], { attachSeriesId: u.id }, (d) => {
                    const moved = (d.aligned || []).map((f) => ADOPTED_FIELD[f] || f);
                    return moved.length
                      ? `Evening attached; the cohort’s ${moved.join(', ')} now describe it.`
                      : 'Evening attached to the cohort.';
                  })}>
                  Attach
                </Action>
              </div>
            ))}
          </div>
        </Card>
      )}
    </Panel>
  );
}


// ── Seat holders: who is actually in each room ───────────────────────────────
// /api/admin/seats is the whole director workflow — see who is in each seat
// room, put a family in one, take a family out. It is its own panel rather than
// a column on the Classes grid because Classes lays out ROOMS and this places
// PEOPLE: different conversations, usually different evenings.
//
// It works in SERIES, one per weekly evening, which is why this panel is no
// longer called "cohorts": the cohort is the object above, and a family in one
// holds a row here for each of its evenings. Renaming the panel is not
// cosmetic — "seat" already names four different things in this system (the
// $550 plan, the reserved room kind, the weekly booking row, and one student in
// one room), and two panels calling themselves cohorts made it five.
//
// Nothing here is decided in the browser. In particular the two flags on each
// holder (payerOnSeatPlan, guardianApproved) are the ROUTE's reading of the
// plan rail and the guardian gate, shown because they are the two ways an
// enrolment can look finished and book absolutely nothing — the weekly sweep
// re-checks both and simply skips a family that fails either, silently. This
// panel is where that stops being silent.
//
// A family is enrolled by EMAIL. The director is sitting with a parent, and
// the only identifier either of them can read is the address on the parent's
// screen; a form asking for two UUIDs would be a console nobody could use.
function SeatsSection() {
  const [data, setData] = useState(null);
  const [msg, setMsg] = useState('');
  const [openFor, setOpenFor] = useState('');
  const [form, setForm] = useState({ payer: '', student: '' });
  const [busy, setBusy] = useState('');

  const load = useCallback(async () => {
    try {
      const res = await authedFetch('/api/admin/seats');
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        // A missing migration answers 503 with `notProvisioned` and a sentence
        // naming it — render that rather than an empty panel that looks fine.
        setData({ cohorts: [], clubOpen: false });
        setMsg(d.error || 'Could not load the seat cohorts.');
        return;
      }
      setData(d);
    } catch {
      setData({ cohorts: [], clubOpen: false });
      setMsg('Could not load the seat cohorts.');
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const setField = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  function startEnrol(cohortId) {
    setMsg('');
    setForm({ payer: '', student: '' });
    setOpenFor((c) => (c === cohortId ? '' : cohortId));
  }

  async function enrol(cohort) {
    if (busy) return;
    setBusy(cohort.id); setMsg('');
    try {
      const res = await authedFetch('/api/admin/seats', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          seriesId: cohort.id, payer: form.payer.trim(), student: form.student.trim(),
        }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { setMsg(d.error || 'Could not enrol that family.'); return; }
      // The route's own sentence is the honest one — it is the only thing that
      // knows whether any room actually got booked. It is marked partial (⚠)
      // whenever a holdup means the calendar stays empty, so a director reading
      // fast never mistakes "recorded" for "on the calendar".
      const clean = d.payerOnSeatPlan && d.guardianApproved;
      setMsg(`${clean ? '✓' : '⚠'} ${d.message || 'Enrolled.'}`);
      setForm({ payer: '', student: '' });
      setOpenFor('');
      load();
    } finally {
      setBusy('');
    }
  }

  async function endEnrolment(cohort, holder) {
    const who = holder.student.name || holder.student.email || 'this student';
    // Ending the weekly place is NOT cancelling the money. The seat plan is a
    // Stripe subscription and this route cannot touch it, so the confirm says
    // so — otherwise a director ends the place, the family keeps being charged,
    // and nobody finds out until the next statement.
    if (!confirm(`End ${who}'s place in “${cohort.title}”?\n\nNo further weeks will be booked; sessions already on the calendar stay booked. This does NOT cancel the seat plan — stop the subscription in Stripe if the family is leaving.`)) return;
    setBusy(holder.standingId); setMsg('');
    try {
      const res = await authedFetch('/api/admin/seats', {
        method: 'DELETE', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ standingId: holder.standingId }),
      });
      const d = await res.json().catch(() => ({}));
      setMsg(res.ok ? `✓ ${d.message || 'Enrolment ended.'}` : d.error || 'Could not end that enrolment.');
      load();
    } finally {
      setBusy('');
    }
  }

  const cohorts = data?.cohorts || [];
  const clubOpen = data?.clubOpen === true;

  return (
    <Panel title="Seat holders · who is in each room" action={
      <Action tone="quiet" onClick={load}><IconRefresh size={12} /> Reload</Action>
    }>
      <div className="px-5 pt-4">
        <p className="text-xs text-muted">
          The reserved product: <Num>{KIND_DEFAULTS.standing_seat.capacity}</Num> students,{' '}
          <Num>{KIND_DEFAULTS.standing_seat.minutes} min</Num>, in person. Lay the cohort out above; put the
          family in it here. One row per weekly evening, because that is what an enrolment is — a family in a
          cohort holds one of these for each of its evenings. Enrolment is a record: the weekly sweep books
          each month and re-checks the plan and the guardian approval every run.
        </p>
      </div>
      {msg && (
        <div className="px-5 pt-3">
          <Notice kind={msg.startsWith('✓') ? 'ok' : msg.startsWith('⚠') ? 'warn' : 'bad'}>
            {msg.startsWith('✓') && <IconCheck size={13} className="inline align-[-2px] mr-1.5" />}
            {msg.replace(/^✓\s*/, '')}
          </Notice>
        </div>
      )}
      {data && !clubOpen && (
        <div className="px-5 pt-3">
          {/* Hard Rule 4: the route refuses the write while the master switch
              is off, so the button says why instead of collecting two emails
              and answering 503. */}
          <Notice kind="warn">
            Selling is closed (<span className="font-opmono">club_enabled</span> off), so nobody can be enrolled
            yet. Lay the cohorts out now; flip “Club selling open” in Settings once counsel clears it.
          </Notice>
        </div>
      )}

      <div className="divide-y divide-border mt-3">
        {cohorts.map((c) => {
          const full = c.seatsTaken >= (c.capacity || KIND_DEFAULTS.standing_seat.capacity);
          return (
            <div key={c.id} className="px-5 py-3.5">
              <div className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">
                    {c.title}
                    {!c.active && <span className="text-muted font-normal"> · paused</span>}
                  </div>
                  <div className="text-xs text-muted truncate">
                    <Num>{WEEKDAYS[c.weekday]} {String(c.localStartTime || '').slice(0, 5)}</Num>
                    {c.timezone ? ` (${c.timezone})` : ''}
                    {c.durationMinutes ? <> · <Num>{c.durationMinutes} min</Num></> : ''}
                    {/* An in-person product with no venue tells no parent where
                        to show up, which is why the blank reads as a warning
                        rather than as nothing. */}
                    {c.venue ? ` · ${c.venue}` : ' · no venue set'}
                    {c.tutorName ? ` · ${c.tutorName}` : ''}
                  </div>
                </div>
                <Tag tone={full ? 'warn' : 'accent'}>
                  {c.seatsTaken}/{c.capacity} seats
                </Tag>
                {/* An unstaffed or uncleared cohort materializes no rooms at
                    all, so an enrolment in it books nothing. */}
                {!c.staffed && <Tag tone="bad">unstaffed</Tag>}
                <Action tone={openFor === c.id ? 'selected' : 'quiet'} className="shrink-0"
                  disabled={!clubOpen || (full && openFor !== c.id)}
                  onClick={() => startEnrol(c.id)}>
                  {openFor === c.id ? <><IconX size={12} /> Close</> : <><IconPlus size={12} /> Enrol a family</>}
                </Action>
              </div>

              {openFor === c.id && (
                <div className="mt-3 grid grid-cols-2 gap-2 rounded-sm border border-border bg-panel2/60 p-3">
                  <input value={form.payer} onChange={setField('payer')} type="email"
                    placeholder="Payer’s email (holds the seat plan)"
                    className="k-input px-3 py-2 text-sm" />
                  <input value={form.student} onChange={setField('student')} type="email"
                    placeholder="Student’s email"
                    className="k-input px-3 py-2 text-sm" />
                  <p className="col-span-2 text-xs text-muted">
                    Both need a Kaizen account already. The payer’s plan is what reserves the place; the
                    student’s guardian approval is what lets them sit in the room.
                  </p>
                  <Button variant="primary" size="sm" block className="col-span-2"
                    disabled={busy === c.id || !form.payer.trim() || !form.student.trim()}
                    onClick={() => enrol(c)}>
                    {busy === c.id ? 'Enrolling…' : 'Enrol into this cohort'}
                  </Button>
                </div>
              )}

              <div className="mt-2 divide-y divide-border/60">
                {(c.holders || []).map((h) => (
                  <div key={h.standingId} className="flex items-center gap-2 py-2">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm truncate">
                        {h.student.name || h.student.email || h.student.id}
                        <span className="text-muted"> · paid by {h.payer.name || h.payer.email || h.payer.id}</span>
                      </div>
                      <div className="text-xs text-muted truncate">
                        plan <Num>{h.payer.plan || 'free'}</Num> · since{' '}
                        <Num>{new Date(h.enrolledAt).toLocaleDateString()}</Num>
                      </div>
                    </div>
                    {/* The two silent failures, named. Green is not decoration
                        here: it is the difference between a booked Thursday and
                        an empty one. */}
                    <Tag tone={h.payerOnSeatPlan ? 'good' : 'bad'}>
                      {h.payerOnSeatPlan ? 'seat plan' : 'no seat plan'}
                    </Tag>
                    <Tag tone={h.guardianApproved ? 'good' : 'bad'}>
                      {h.guardianApproved ? 'guardian ok' : 'no guardian approval'}
                    </Tag>
                    <Action tone="ghost" className="shrink-0" disabled={busy === h.standingId}
                      onClick={() => endEnrolment(c, h)}>
                      {busy === h.standingId ? 'Ending…' : 'End'}
                    </Action>
                  </div>
                ))}
                {(c.holders || []).length === 0 && (
                  <p className="py-2 text-xs text-muted">Nobody enrolled yet.</p>
                )}
              </div>
            </div>
          );
        })}
        {data && cohorts.length === 0 && (
          <Empty>No seat rooms yet. Create a cohort above and both of its evenings appear here.</Empty>
        )}
        {data === null && <Empty>Loading…</Empty>}
      </div>
    </Panel>
  );
}

// The unpaid-room queue is a BOUNDED, newest-first scan, not a permanent list:
// maintenance.unpaidGroupRooms() looks back a fixed window and cuts the result
// off at a limit, so an old unsettled room can age off the only screen that
// shows it. This screen therefore never promises permanence — it reports what
// the payload can prove. unpaidGroupRooms() reports its own cut as
// { rooms, total, truncated, lookbackDays }; that envelope may arrive whole or
// flattened onto the response, and an older build sent a bare array. All three
// are read here, and when nothing says otherwise the caption still calls the
// view bounded rather than implying the list is complete.
function readRoomQueue(payload) {
  const raw = payload?.rooms;
  const box = Array.isArray(raw) ? { rooms: raw } : (raw && typeof raw === 'object' ? raw : {});
  const list = (Array.isArray(box.rooms) ? box.rooms : Array.isArray(box.items) ? box.items : [])
    .filter((r) => r && r.roomId);
  const num = (...vals) => vals.find((v) => Number.isFinite(v));
  const totalRaw = num(box.total, box.totalCount, payload?.roomsTotal);
  const total = Number.isFinite(totalRaw) && totalRaw >= list.length ? totalRaw : null;
  const truncated = box.truncated === true || box.hasMore === true || payload?.roomsTruncated === true
    || (total !== null && total > list.length);
  const lookbackRaw = num(box.lookbackDays, payload?.roomsLookbackDays);
  return { list, total, truncated, lookbackDays: Number.isFinite(lookbackRaw) ? lookbackRaw : null };
}

// A write-off is reversible on the SERVER (accrueGroupRoom overwrites the $0
// "nothing owed" row), but nothing lists written-off rooms, so without a record
// of which room to reverse the affordance is unreachable. This is that record:
// a small, browser-local index of write-offs made from this device. It is not a
// source of truth and is not an audit trail (audit_log is) — it exists so the
// Accrue button has something to point at. The confirm dialog says exactly this
// much and no more.
const WRITE_OFF_KEY = 'kaizen.admin.writtenOffRooms';
const WRITE_OFF_MAX = 25;
function readWriteOffs() {
  try {
    const v = JSON.parse(window.localStorage.getItem(WRITE_OFF_KEY) || '[]');
    return Array.isArray(v) ? v.filter((r) => r && r.roomId).slice(0, WRITE_OFF_MAX) : [];
  } catch { return []; }
}
function saveWriteOffs(list) {
  try { window.localStorage.setItem(WRITE_OFF_KEY, JSON.stringify(list.slice(0, WRITE_OFF_MAX))); } catch { /* private mode: the list is a convenience, not the record */ }
  return list.slice(0, WRITE_OFF_MAX);
}

// ── Diagnostics: the first thing the director sells, and the report they owe ──
// A family pays $59 for an adaptive placement AND a written report from the
// person who will teach their child. The placement is measured by the engine;
// the report is written here, by a human, which is the whole reason the product
// is worth charging for. Until this panel existed, `delivered`, `report_md` and
// `refunded` were columns with no writer — the money came in and the promise
// had nowhere to land.
//
// Marking one delivered REQUIRES the report text. A delivery with nothing
// written is a number on the funnel board and nothing in the family's hands.
function DiagnosticsSection() {
  const [data, setData] = useState(null);
  const [msg, setMsg] = useState('');
  const [openFor, setOpenFor] = useState('');
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState('');

  const load = useCallback(async () => {
    try {
      const res = await authedFetch('/api/admin/diagnostics');
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { setData({ orders: [] }); setMsg(d.error || 'Could not load diagnostics.'); return; }
      setData(d);
    } catch {
      setData({ orders: [] });
      setMsg('Could not load diagnostics.');
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  async function move(orderId, event, reportMd) {
    setBusy(orderId); setMsg('');
    try {
      const res = await authedFetch('/api/admin/diagnostics', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, event, ...(reportMd == null ? {} : { reportMd }) }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { setMsg(d.error || 'That did not go through.'); return; }
      setMsg(`\u2713 Marked ${d.status}.`);
      setOpenFor(''); setDraft('');
      await load();
    } finally { setBusy(''); }
  }

  const orders = data?.orders || [];
  const owed = orders.filter((o) => ['paid', 'scheduled'].includes(o.status)).length;

  return (
    <Panel title="Diagnostics · placement reports" action={
      <Action tone="quiet" onClick={load}><IconRefresh size={12} /> Reload</Action>
    }>
      <div className="px-5 pt-4">
        <p className="text-xs text-muted">
          One row per purchase. <Num>{owed}</Num> paid and not yet delivered — that is the
          queue. The report is written by a person; the engine only measures. It is credited
          in full against the first month if the family takes a seat within{' '}
          <Num>{DIAGNOSTIC.creditWindowDays} days</Num>, which is applied in Stripe by hand today.
        </p>
      </div>
      {msg && (
        <div className="px-5 pt-3">
          <Notice kind={msg.startsWith('\u2713') ? 'ok' : 'bad'}>{msg.replace(/^\u2713\s*/, '')}</Notice>
        </div>
      )}
      {data?.notProvisioned && (
        <div className="px-5 pt-3">
          <Notice kind="warn">
            The <span className="font-opmono">diagnostic_order</span> table is not in this database yet
            (migration 0036). Nothing has been sold and nothing is lost — run the migration.
          </Notice>
        </div>
      )}

      <div className="divide-y divide-border mt-3">
        {orders.map((o) => (
          <div key={o.id} className="px-5 py-3.5">
            <div className="flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">
                  {o.student?.name || o.student?.email || 'Student'}
                  <span className="text-muted font-normal">
                    {o.payer?.email ? ` \u00b7 paid by ${o.payer.email}` : ''}
                  </span>
                </div>
                <div className="text-xs text-muted truncate">
                  <Num>{dollars(o.amountCents)}</Num>
                  {o.placementSessionId ? ' \u00b7 placement sat' : ' \u00b7 placement not sat'}
                  {o.deliveredAt ? ` \u00b7 delivered ${new Date(o.deliveredAt).toLocaleDateString()}` : ''}
                </div>
              </div>
              <Tag tone={o.status === 'delivered' ? 'accent' : o.status === 'refunded' ? 'bad' : 'warn'}>
                {o.status}
              </Tag>
              {o.status !== 'pending' && o.status !== 'refunded' && (
                <Action tone={openFor === o.id ? 'selected' : 'quiet'} className="shrink-0"
                  onClick={() => { setOpenFor(openFor === o.id ? '' : o.id); setDraft(o.reportMd || ''); }}>
                  {openFor === o.id ? <><IconX size={12} /> Close</> : o.status === 'delivered' ? 'Edit report' : 'Write report'}
                </Action>
              )}
            </div>

            {openFor === o.id && (
              <div className="mt-3 rounded-sm border border-border bg-panel2/60 p-3">
                <textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={8}
                  placeholder="What we measured, what it means, and the one thing to work on first."
                  className="k-input w-full px-3 py-2 text-sm" />
                <p className="text-xs text-muted mt-2">
                  This is what the family reads. Say what the placement showed, in their child\u2019s
                  words where you can. Never promise a grade.
                </p>
                <div className="mt-2 flex gap-2">
                  <Action tone="good" disabled={busy === o.id || !draft.trim()}
                    onClick={() => move(o.id, 'delivered', draft)}>
                    <IconCheck size={12} /> {o.status === 'delivered' ? 'Save report' : 'Deliver'}
                  </Action>
                  <Action tone="quiet" disabled={busy === o.id}
                    onClick={() => move(o.id, 'refunded')}>
                    Refunded
                  </Action>
                </div>
              </div>
            )}
          </div>
        ))}
        {data && orders.length === 0 && <Empty>No diagnostics sold yet.</Empty>}
        {data === null && <Empty>Loading\u2026</Empty>}
      </div>
    </Panel>
  );
}

function EarningsSection() {
  const [ledger, setLedger] = useState(null);
  const [queue, setQueue] = useState({ list: [], total: null, truncated: false, lookbackDays: null });
  const [roomsUnavailable, setRoomsUnavailable] = useState(false);
  const [writeOffs, setWriteOffs] = useState([]);
  const [msg, setMsg] = useState('');
  const [busyRoom, setBusyRoom] = useState('');

  const load = useCallback(async () => {
    const res = await authedFetch('/api/admin/earnings');
    if (!res.ok) {
      setLedger([]); setQueue({ list: [], total: null, truncated: false, lookbackDays: null }); setRoomsUnavailable(false);
      return;
    }
    const d = await res.json();
    setLedger(d.tutors || []);
    setQueue(readRoomQueue(d));
    setRoomsUnavailable(d.roomsUnavailable === true);
  }, []);
  useEffect(() => { load(); }, [load]);
  // localStorage only exists on the client; read it after mount so the server
  // render and the first client render agree.
  useEffect(() => { setWriteOffs(readWriteOffs()); }, []);

  // A group room the hourly sweep would not pay: it ended with no attendance
  // and no exit summary on any seat, so nothing recorded that the TUTOR was
  // there (a room going 'in_progress' only proves a student joined). This is
  // the only path that pays such a room — an admin vouching for the hour —
  // and the only one that can retire it as a genuine tutor no-show. Without
  // it the tutor was simply never paid and the room needed hand-written SQL.
  async function settleRoom(room, action, { reversing = false } = {}) {
    const pay = `$${(room.wouldPayCents / 100).toFixed(2)}`;
    const ask = action === 'accrue'
      ? (reversing
        ? `Reverse the write-off and accrue ${pay} to ${room.tutorName}?\n\nThis replaces the $0 "nothing owed" settlement with a real accrual at the room's own rate. Do it only if you have confirmed the session really was taught.`
        : `Accrue ${pay} to ${room.tutorName} for this room?\n\nDo this only if you have confirmed the session really was taught — the roster was never closed, so nothing in the system shows the tutor was present.`)
      // Say what actually happens. A written-off room leaves the sweep, this
      // queue and the tutor's screen for good; the only way back to it is the
      // browser-local list below.
      : `Record NOTHING OWED for this room (${room.tutorName})?\n\nUse this when the tutor did not run the session. It writes a $0 settlement and removes the room from this queue, the hourly sweep and the tutor's own screen.\n\nTo undo it, use the "Written off" list below — this browser keeps it. On another browser, or after site data is cleared, nothing in the admin UI can reach this room again.`;
    if (!confirm(ask)) return;
    setBusyRoom(room.roomId); setMsg('');
    const res = await authedFetch('/api/admin/earnings', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ groupSessionId: room.roomId, action }),
    });
    const d = await res.json().catch(() => ({}));
    setBusyRoom('');
    if (res.ok && action === 'no_pay') {
      setWriteOffs((prev) => saveWriteOffs([
        {
          roomId: room.roomId, tutorName: room.tutorName, tutorId: room.tutorId,
          subject: room.subject, topic: room.topic, end: room.end,
          wouldPayCents: room.wouldPayCents, at: new Date().toISOString(),
        },
        ...prev.filter((w) => w.roomId !== room.roomId),
      ]));
    }
    // Accrued (including a reversal): the write-off no longer stands, so drop
    // the pointer to it rather than offering a button that would now 409.
    if (res.ok && action === 'accrue') {
      setWriteOffs((prev) => saveWriteOffs(prev.filter((w) => w.roomId !== room.roomId)));
    }
    // Report the amount the SERVER wrote, not the one this row was showing —
    // the recompute is the authority on what a room pays.
    const paid = Number.isFinite(d?.amountCents) ? `$${(d.amountCents / 100).toFixed(2)}` : pay;
    setMsg(res.ok
      ? (action === 'accrue'
        ? `✓ Accrued ${paid} to ${room.tutorName}.${reversing ? ' Write-off reversed.' : ''}`
        : '✓ Recorded as nothing owed. Undo it from “Written off” below.')
      : d.error || 'Failed.');
    load();
  }

  // Clearing the pointer is the one thing here that cannot be undone from the
  // UI — it is the last link back to a $0 settlement — so it asks first.
  function forgetWriteOff(room) {
    if (!confirm(`Remove this room from the written-off list?\n\nThe $0 settlement stays exactly as it is; only this browser's shortcut back to it goes away. After this, reversing it needs a database query.`)) return;
    setWriteOffs((prev) => saveWriteOffs(prev.filter((w) => w.roomId !== room.roomId)));
  }

  async function markPaid(tutorId, name, accruedCents) {
    if (!confirm(`Mark $${(accruedCents / 100).toFixed(2)} as PAID to ${name}? Do this only after the transfer is sent — and never before their W-9 is on file.`)) return;
    const res = await authedFetch('/api/admin/earnings', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tutorId }),
    });
    const d = await res.json().catch(() => ({}));
    setMsg(res.ok ? `✓ Marked ${d.items} session(s) paid.` : d.error || 'Failed.');
    load();
  }

  async function exportCsv() {
    const res = await authedFetch('/api/admin/earnings?csv=1');
    if (!res.ok) { setMsg('CSV export failed.'); return; }
    const blob = await res.blob();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `kaizen-earnings-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <Panel
      title="Tutor payouts · manual until Connect"
      action={<Action tone="quiet" onClick={exportCsv}>Export CSV</Action>}
    >
      <div className="px-5 pt-4">
        <p className="text-xs text-muted">
          Club sessions accrue the tutor&apos;s flat hourly pay ({dollars(TUTOR_PAY.minCents)} to {dollars(TUTOR_PAY.maxCents)}/hr, set per tutor; certified tutors default to {dollars(TUTOR_PAY.certifiedDefaultCents)}); legacy bookings keep
          their recorded revenue split. Collect a <b>W-9 before the first payout</b>; 1099-NEC at $600+/yr.
        </p>
      </div>
      {/* A leading "✓" on the message marks success; it renders as the icon.
          Anything else is a failure and stays out of the ok channel. */}
      {msg && (
        <div className="px-5 pt-3">
          <Notice kind={msg.startsWith('✓') ? 'ok' : 'bad'}>
            {msg.startsWith('✓') && <IconCheck size={13} className="inline align-[-2px] mr-1.5" />}
            {msg.replace(/^✓\s*/, '')}
          </Notice>
        </div>
      )}
      <div className="divide-y divide-border mt-3">
        {(ledger || []).map((t) => (
          <div key={t.tutorId} className="px-5 py-3 flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">{t.name}</div>
              <div className="text-xs text-muted truncate">{t.email} · paid <Num>${(t.paidCents / 100).toFixed(2)}</Num> to date</div>
            </div>
            <Num className="text-t3 font-semibold">${(t.accruedCents / 100).toFixed(2)}</Num>
            {t.accruedCents > 0 && (
              <Action tone="good" className="shrink-0" onClick={() => markPaid(t.tutorId, t.name, t.accruedCents)}>
                Mark paid
              </Action>
            )}
          </div>
        ))}
        {ledger && ledger.length === 0 && <Empty>No earnings yet.</Empty>}
        {ledger === null && <Empty>Loading…</Empty>}
      </div>
      {roomsUnavailable && (
        <div className="px-5 pt-4 pb-1 border-t border-border mt-3">
          <Notice kind="bad">
            The unpaid-room queue could not be loaded, so this screen is showing the ledger only:
            rooms that ran without a closed roster are <b>not</b> listed below. Reload; if it keeps failing, check the server logs.
          </Notice>
        </div>
      )}
      {queue.list.length > 0 && (
        <div className="border-t border-border mt-3">
          <div className="px-5 pt-4">
            <h3 className="text-sm font-semibold text-ink">
              Rooms that ran but aren&apos;t on the ledger
              <Num className="ml-2 text-muted font-normal">
                {queue.total !== null ? `${queue.list.length} of ${queue.total}` : queue.list.length}
              </Num>
            </h3>
            <p className="text-xs text-muted mt-1.5">
              Nobody marked attendance or wrote an exit summary, so nothing shows the <b>tutor</b> was in the room:
              a room opening only proves a student joined. These are never paid automatically. Check with the tutor,
              then accrue the hour or record that nothing is owed. Unresolved rooms close unpaid a week after they end;
              closing unpaid does not settle them, so they stay owed until someone acts here.
            </p>
            {/* Never claim this list is everything: it is a bounded scan. Say
                so plainly, and say it harder when the payload proves it cut. */}
            {queue.truncated ? (
              <p className="text-xs text-warn font-semibold mt-2">
                Showing {queue.total !== null && queue.total > queue.list.length
                  ? `${queue.list.length} of ${queue.total}` : `the ${queue.list.length} most recent`}.
                This view is cut, so older unsettled rooms are <b>not shown</b> and no screen will surface them.
                Settle these and reload to bring the rest into view.
              </p>
            ) : (
              <p className="text-xs text-muted mt-2">
                Showing the {queue.list.length} most recent
                {queue.lookbackDays !== null ? ` of the last ${queue.lookbackDays} days` : ''}. This queue is a
                bounded, newest-first scan, not a permanent list: if it ever fills up, older unsettled rooms fall
                off it and only a database query will find them.
              </p>
            )}
          </div>
          <div className="divide-y divide-border mt-3">
            {queue.list.map((r) => (
              <div key={r.roomId} className="px-5 py-3 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">
                    {r.topic || r.subject || 'Session'} · <span className="text-muted">{r.tutorName}</span>
                  </div>
                  <div className="text-xs text-muted truncate">
                    <Num>{new Date(r.end).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</Num>
                    {' · '}<Num>{r.seats}</Num> settled seat{r.seats === 1 ? '' : 's'}
                    {r.state === 'closed_unpaid' && <span className="text-bad font-semibold"> · closed unpaid</span>}
                    {r.state === 'awaiting_tutor' && r.holdExpiresAt && (
                      <span className="text-warn font-semibold"> · roster open until {new Date(r.holdExpiresAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
                    )}
                    {r.state === 'awaiting_sweep' && <span> · pays on the next hourly tick</span>}
                  </div>
                </div>
                <Num className="text-t3 font-semibold">${(r.wouldPayCents / 100).toFixed(2)}</Num>
                <div className="flex gap-1.5 shrink-0">
                  <Action tone="good" onClick={() => settleRoom(r, 'accrue')} disabled={busyRoom === r.roomId}>
                    Accrue
                  </Action>
                  {/* Writing a room off is only ever right when nothing shows
                      the tutor was there; the server refuses it otherwise. */}
                  {!r.rosterClosed && (
                    <Action tone="quiet" onClick={() => settleRoom(r, 'no_pay')} disabled={busyRoom === r.roomId}
                      title="The tutor did not run this session">
                      No pay
                    </Action>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {writeOffs.length > 0 && (
        <div className="border-t border-border mt-3">
          <div className="px-5 pt-4">
            <h3 className="text-sm font-semibold text-ink">
              Written off <Num className="ml-2 text-muted font-normal">{writeOffs.length}</Num>
            </h3>
            <p className="text-xs text-muted mt-1.5">
              Rooms settled at $0 as &ldquo;nothing owed&rdquo;. <b>Accrue</b> reverses one for real: it replaces the
              $0 settlement with the room&apos;s own hourly pay. This list of what to reverse is kept in{' '}
              <b>this browser only</b> (last {WRITE_OFF_MAX}): it is not on the server, so it will not appear on
              another device or survive clearing site data. The write-off itself is recorded server-side in the
              audit log.
            </p>
          </div>
          <div className="divide-y divide-border mt-3">
            {writeOffs.map((w) => (
              <div key={w.roomId} className="px-5 py-3 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">
                    {w.topic || w.subject || 'Session'} · <span className="text-muted">{w.tutorName}</span>
                  </div>
                  <div className="text-xs text-muted truncate">
                    {w.end ? <><Num>{new Date(w.end).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</Num>{' · '}</> : ''}
                    written off <Num>{w.at ? new Date(w.at).toLocaleDateString([], { month: 'short', day: 'numeric' }) : 'recently'}</Num>
                  </div>
                </div>
                <Num className="text-t3 font-semibold text-muted">
                  ${((w.wouldPayCents || 0) / 100).toFixed(2)}
                </Num>
                <div className="flex gap-1.5 shrink-0">
                  {w.wouldPayCents > 0 && (
                    <Action tone="good" onClick={() => settleRoom(w, 'accrue', { reversing: true })} disabled={busyRoom === w.roomId}
                      title="Undo the write-off and pay this room">
                      Accrue
                    </Action>
                  )}
                  <Action tone="quiet" onClick={() => forgetWriteOff(w)}
                    title="Remove from this browser's list; the $0 settlement stays">
                    Clear
                  </Action>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </Panel>
  );
}

// ── Local primitives ────────────────────────────────────────────────────────
// One shell, one panel, one row button, one status pill, one record figure.
// Everything on this screen is built from these five, which is the point: a new
// admin row cannot invent its own size, radius or hue.

function Shell({ children }) {
  return (
    <div className="min-h-screen bg-paper text-ink">
      <AppHeader width="wide" />
      <Section as="main" width="wide" space="tight">{children}</Section>
    </div>
  );
}

// A number the console asserts: money, counts, percentages, times. Mono with
// tabular numerals so columns of them line up and a changing figure does not
// reflow the row beside it.
function Num({ className = '', children }) {
  return <span className={`font-opmono tabular-nums ${className}`}>{children}</span>;
}

function Metric({ label, value }) {
  return (
    <Card pad="sm">
      <Stat value={value} label={label} />
    </Card>
  );
}

// A titled group. `tone="alert"` is the one deviation, reserved for safety
// reports: the panel edge says so. `bare` drops the surrounding card for the
// two groups whose contents are themselves cards — a room and a cohort are
// objects and keep their own card, and a card inside a card is a box for a box.
function Panel({ title, tone = 'default', action, bare = false, children }) {
  return (
    <section className="mt-8">
      <div className="mb-2 px-1 flex items-end justify-between gap-3">
        <h2 className={`k-label ${tone === 'alert' ? 'text-bad' : ''}`}>{title}</h2>
        {action}
      </div>
      {bare ? children : (
        <Card pad="none" className={`overflow-hidden ${tone === 'alert' ? 'border-bad/40' : ''}`}>
          {children}
        </Card>
      )}
    </section>
  );
}

// The small row button, in five tones. Hue codes the kind of act and the
// foreground stays at ink (the k-badge doctrine) so a label is never a tinted
// whisper on an operations screen. `selected` is the one rose use here: rose
// marks selection, ink acts.
const ACTION_TONE = {
  quiet: 'bg-panel2 text-ink border border-border hover:border-ink/25',
  good: 'bg-good/15 text-ink hover:bg-good/25',
  warn: 'bg-warn/15 text-ink hover:bg-warn/25',
  bad: 'bg-bad/15 text-ink hover:bg-bad/25',
  ghost: 'text-muted hover:text-bad hover:bg-bad/10',
  selected: 'bg-accent text-paper hover:bg-accent/90',
};

function Action({ tone = 'quiet', className = '', children, ...rest }) {
  return (
    <button
      className={'inline-flex items-center justify-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold '
        + 'transition-colors disabled:opacity-40 disabled:pointer-events-none '
        + `${ACTION_TONE[tone] || ACTION_TONE.quiet} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}

const TAG_TONE = {
  good: 'bg-good/15 text-ink',
  warn: 'bg-warn/15 text-ink',
  bad: 'bg-bad/15 text-ink',
  accent: 'bg-accent/15 text-ink',
  muted: 'bg-panel2 text-muted',
};

function Tag({ tone = 'muted', children }) {
  return <span className={`k-badge shrink-0 ${TAG_TONE[tone] || TAG_TONE.muted}`}>{children}</span>;
}

// The console's empty row, now the product's one empty state (ui/EmptyState).
// It was defined twice — once here and once in the tutor workspace, with
// different padding and a different type size.
function Empty({ children }) {
  return <EmptyState>{children}</EmptyState>;
}

// What the console looks like while it is still asking. Panels, in the order
// they will arrive, so the page does not jump when they do.
function ConsoleSkeleton() {
  return (
    <>
      {/* The one thing here that is not decoration: a screen reader is told the
          console is still loading, and the rectangles are hidden from it. */}
      <p className="sr-only" role="status">Loading the console…</p>
      <div className="mt-7" aria-hidden="true">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[0, 1, 2, 3].map((i) => (
          <Card key={i} pad="sm">
            <Bar className="h-6 w-16" />
            <Bar className="h-3 w-24 mt-2.5" />
          </Card>
        ))}
      </div>
      {[0, 1, 2].map((i) => (
        <section key={i} className="mt-8">
          <Bar className="h-3 w-32 mb-2 ml-1" />
          <Card pad="none" className="overflow-hidden">
            {[0, 1, 2].map((r) => (
              <div key={r} className="px-5 py-4 border-b border-border last:border-0">
                <Bar className="h-3.5 w-1/3" />
                <Bar className="h-3 w-2/3 mt-2" />
              </div>
            ))}
          </Card>
        </section>
      ))}
      </div>
    </>
  );
}

// One grey bar. motion-reduce turns the pulse off rather than animating a
// screenful of rectangles at somebody who asked for stillness.
function Bar({ className = '' }) {
  return <div className={`rounded-sm bg-panel2 animate-pulse motion-reduce:animate-none ${className}`} />;
}

// The launch plan's day-one dashboard (v2 §6): unit economics and retention,
// computed live by /api/admin/metrics. Numbers a founder acts on weekly —
// seats per tutor-hour decides scheduling, conversion decides the funnel.
function BusinessMetricsSection() {
  const [days, setDays] = useState(30);
  const [m, setM] = useState(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    setM(null); setErr('');
    authedFetch(`/api/admin/metrics?days=${days}`).then(async (r) => {
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { setErr(d.error || 'Could not load metrics.'); return; }
      setM(d);
    }).catch(() => setErr('Could not load metrics.'));
  }, [days]);

  const dollars = (c) => `$${((c || 0) / 100).toFixed(2)}`;
  return (
    <Panel
      title="Business metrics"
      action={
        <div className="flex gap-1.5">
          {[30, 90].map((d) => (
            <Action key={d} tone={days === d ? 'selected' : 'quiet'} onClick={() => setDays(d)}>
              {d} days
            </Action>
          ))}
        </div>
      }
    >
      {err && <div className="px-5 pt-4"><Notice kind="bad">{err}</Notice></div>}
      {!m && !err && <Empty>Computing…</Empty>}
      {m && (
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Metric label="Seats per tutor-hour" value={m.rooms.seatsPerTutorHour} />
            <Metric label={`First to second conversion${m.conversion.pct == null ? ' (no data yet)' : ''}`}
              value={m.conversion.pct == null ? 'n/a' : `${m.conversion.pct}%`} />
            <Metric label="Tutor-hours delivered" value={m.rooms.tutorHours} />
            <Metric label="Seat holders" value={m.membership.byTier.seat || 0} />
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            <Card variant="inset" pad="sm">
              <p className="k-label mb-1.5">Occupancy</p>
              {Object.entries(m.rooms.occupancy).length === 0 && <p className="text-muted">No rooms ran yet.</p>}
              {Object.entries(m.rooms.occupancy).map(([k, v]) => (
                <p key={k} className="text-muted">{k.replace('_', ' ')}: <Num className="text-ink font-semibold">{v.occupancyPct}%</Num> · <Num className="text-ink">{v.rooms}</Num> rooms</p>
              ))}
            </Card>
            {/* This card printed the three RETIRED tiers and never the seat —
                the one recurring product on sale — so the founder's own board
                counted the business it used to be. The tier keys come from
                clubPricing rather than being typed, so retiring or adding one
                moves this card with it. */}
            <Card variant="inset" pad="sm">
              <p className="k-label mb-1.5">Seats</p>
              <p className="text-muted">
                {PLAN_DEFS.seat.label}: <Num className="text-ink font-semibold">{m.membership.byTier.seat || 0}</Num>
              </p>
              <p className="text-muted">Included sessions used: <Num className="text-ink font-semibold">{m.membership.includedVisitsUsed}</Num></p>
              <p className="text-muted">Member drop-in buys: <Num className="text-ink font-semibold">{m.membership.overagePurchases}</Num></p>
              {/* Retired tiers only appear if somebody is still on one, and they
                  say retired when they do. Nobody can buy one. */}
              {Object.keys(CLUB_PLANS).some((k) => (m.membership.byTier[k] || 0) > 0) && (
                <p className="text-muted mt-1">
                  Retired tiers:{' '}
                  {Object.keys(CLUB_PLANS)
                    .filter((k) => (m.membership.byTier[k] || 0) > 0)
                    .map((k) => `${CLUB_PLANS[k].label} ${m.membership.byTier[k]}`)
                    .join(' · ')}
                </p>
              )}
            </Card>
            <Card variant="inset" pad="sm">
              <p className="k-label mb-1.5">Sessions</p>
              <p className="text-muted">Group seats settled: <Num className="text-ink font-semibold">{m.sessions.groupSeatsSettled}</Num></p>
              {/* 1:1 is a CUT product; these two lines are legacy rows, kept so
                  old money still reconciles and labelled so nobody reads them
                  as something on sale. */}
              <p className="text-muted">1:1 booked (legacy): <Num className="text-ink font-semibold">{m.sessions.oneOnOneBooked}</Num></p>
              <p className="text-muted">No-shows: <Num className="text-ink font-semibold">{m.sessions.noShows}</Num> · Refunds: <Num className="text-ink font-semibold">{m.sessions.refunds}</Num></p>
            </Card>
            <Card variant="inset" pad="sm">
              <p className="k-label mb-1.5">Money · <Num>{m.windowDays}d</Num></p>
              <p className="text-muted">Group revenue: <Num className="text-ink font-semibold">{dollars(m.revenue.groupCents)}</Num></p>
              <p className="text-muted">1:1 revenue (legacy): <Num className="text-ink font-semibold">{dollars(m.revenue.privateCents)}</Num></p>
              <p className="text-muted">Tutor pay accrued: <Num className="text-ink font-semibold">{dollars(m.tutorPay.accruedCents)}</Num> · paid: <Num className="text-ink font-semibold">{dollars(m.tutorPay.paidCents)}</Num></p>
            </Card>
          </div>
          <p className="text-xs text-muted">
            First to second conversion counts students whose first settled booking is at least 14 days old.
            Occupancy counts settled seats against capacity for rooms that already ran. Capacity policy: 8 per tutor in Halls.
          </p>
        </div>
      )}
    </Panel>
  );
}
