'use client';

import { useMemo, useState } from 'react';
import { limitedFetch } from '@/lib/limits';
import { logEvent } from '@/lib/devlog';
import { masteryPercent, statusOf } from '@/lib/mastery';
import { IconCalendar, IconSprout, IconBook, IconCheck } from '@/components/Icons';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Notice from '@/components/ui/Notice';
import Stat from '@/components/ui/Stat';

// WHAT THIS SCREEN MAY CALL THINGS
//
// Every number on this tab comes from `masteryPercent()` — an SM-2 display
// score derived from sessions the student asked the companion to grade, in a
// chat where hints were available, held in localStorage. It is a useful picture
// of how practice is going. It is not the mastery record: that lives in the
// `evidence` ledger, is only ever written from unassisted, verified, delayed
// work, and reaches the product through /api/engine/state. The two never touch.
//
// So the word "mastery" does not appear on this screen. Under the mastery law
// (CLAUDE.md rule 5, docs/ENGINE.md) it is the one word this number may not
// wear, and a student who reads "Avg mastery 84%" after a week of hinted
// practice has been told something the product cannot stand behind. It says
// "practice" instead, which is exactly what it measures.

// ── Practice sparkline ────────────────────────────────────────────────────────
// The chart's y domain is fixed 0-100 (masteryPercent is clamped there, and the
// scale below floors at 0 and ceils at 100), which is what lets the 75% rule be
// drawn as a constant. That rule is the same 75% the card header names.
const CHART_H = 80, CHART_PAD = 4;
const Y75 = CHART_H - CHART_PAD - 0.75 * (CHART_H - CHART_PAD * 2);

function PracticeChart({ history, current }) {
  const points = useMemo(() => {
    const data = [...history.map((h) => h.avg), current].slice(-30);
    if (data.length < 2) return null;
    const w = 300, h = 80, pad = 4;
    const min = Math.min(...data, 0);
    const max = Math.max(...data, 100);
    const step = (w - pad * 2) / (data.length - 1);
    return data.map((v, i) => [
      pad + i * step,
      h - pad - ((v - min) / (max - min || 1)) * (h - pad * 2),
    ]);
  }, [history, current]);

  if (!points) {
    return (
      <div className="h-20 flex items-center justify-center text-xs text-muted">
        Grade a few sessions to see your trend
      </div>
    );
  }

  const line = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0]},${p[1]}`).join(' ');
  const area = `${line} L${points[points.length - 1][0]},80 L${points[0][0]},80 Z`;
  const last = points[points.length - 1];

  return (
    <svg viewBox="0 0 300 80" className="w-full h-20">
      <defs>
        <linearGradient id="mgrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgb(var(--c-accent))" stopOpacity="0.25" />
          <stop offset="100%" stopColor="rgb(var(--c-accent))" stopOpacity="0" />
        </linearGradient>
      </defs>
      <line
        x1={CHART_PAD} y1={Y75} x2={300 - CHART_PAD} y2={Y75}
        stroke="rgb(var(--c-border))" strokeWidth="1" strokeDasharray="3 3"
      />
      <path d={area} fill="url(#mgrad)" />
      <path d={line} fill="none" stroke="rgb(var(--c-accent))" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx={last[0]} cy={last[1]} r="4" fill="rgb(var(--c-accent))" />
      <circle cx={last[0]} cy={last[1]} r="7" fill="rgb(var(--c-accent))" opacity="0.2" />
    </svg>
  );
}

// ── Consistency grid (8 weeks) ────────────────────────────────────────────────
// Rows are days of the week, columns are weeks, so the row labels are the
// chart's y axis and the legend says what a filled cell means. Binary on
// purpose: a day either had a session or it did not.
const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function ConsistencyGrid({ activity }) {
  const cells = useMemo(() => {
    const set = new Set(activity);
    const out = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    // start from 8 weeks ago, aligned to Sunday
    const start = new Date(today);
    start.setDate(start.getDate() - 55 - start.getDay());
    for (let i = 0; i < 8 * 7; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      if (d > today) break;
      out.push({ date: d, active: set.has(d.toISOString().slice(0, 10)) });
    }
    return out;
  }, [activity]);

  return (
    <div>
      <div className="flex items-start gap-2">
        <div className="grid grid-rows-7 gap-1 shrink-0">
          {DAY_LABELS.map((d, i) => (
            <span key={i} className="h-3.5 flex items-center font-opmono text-micro text-muted leading-none">{d}</span>
          ))}
        </div>
        <div className="grid grid-flow-col grid-rows-7 gap-1">
          {cells.map((c, i) => (
            <span
              key={i}
              title={c.date.toLocaleDateString()}
              className={`w-3.5 h-3.5 rounded-sm ${c.active ? 'bg-good' : 'bg-panel2 border border-border'}`}
            />
          ))}
        </div>
      </div>
      <div className="mt-3 flex items-center gap-2 font-opmono text-micro uppercase text-muted">
        <span className="w-3 h-3 rounded-sm bg-good shrink-0" />
        <span>studied</span>
        <span className="w-3 h-3 rounded-sm bg-panel2 border border-border shrink-0 ml-2" />
        <span>no session</span>
      </div>
    </div>
  );
}

export default function ProgressView({ app, concepts }) {
  const avg = concepts.length
    ? Math.round(concepts.reduce((s, c) => s + masteryPercent(c), 0) / concepts.length)
    : 0;
  const strong = concepts.filter((c) => masteryPercent(c) >= 75).length;
  const totalSessions = concepts.reduce((n, c) => n + c.history.length, 0);
  const doneAll = app.assignments.filter((a) => a.status === 'done').length;

  const weakest = [...concepts]
    .filter((c) => c.lastQuality !== null)
    .sort((a, b) => masteryPercent(a) - masteryPercent(b))
    .slice(0, 3);

  return (
    <div className="space-y-6 pb-28">
      <div className="pt-1">
        <h1 className="font-brand text-t1 font-semibold text-ink">Growth</h1>
        <p className="text-xs text-muted mt-1">Small steps, compounding. Here&apos;s what you&apos;ve built.</p>
      </div>

      {/* Stat tiles. The streak is a neutral count of days studied, never a
          thing to lose, so it carries a calendar rather than a flame. */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: 'Day streak', value: app.streak.count, Icon: IconCalendar, tint: 'text-accent bg-accent/10' },
          { label: 'Practice score', value: `${avg}%`, Icon: IconSprout, tint: 'text-good bg-good/10' },
          { label: 'Sessions', value: totalSessions, Icon: IconBook, tint: 'text-accent bg-accent/10' },
          { label: 'Assignments done', value: doneAll, Icon: IconCheck, tint: 'text-good bg-good/10' },
        ].map((s) => (
          <Card key={s.label} variant="inset" pad="sm">
            <div className={`w-8 h-8 rounded-sm flex items-center justify-center ${s.tint}`}><s.Icon size={17} /></div>
            <Stat value={s.value} label={s.label} className="mt-2" />
          </Card>
        ))}
      </div>

      {/* Practice trend */}
      <Card pad="sm">
        <div className="flex items-baseline justify-between gap-3 mb-2">
          <h2 className="font-brand text-t3 font-semibold text-ink">Practice trend</h2>
          <span className="text-xs text-muted">
            <span className="font-opmono tabular-nums">{strong}</span> of{' '}
            <span className="font-opmono tabular-nums">{concepts.length}</span> concepts scoring 75% or more
          </span>
        </div>
        <PracticeChart history={app.masteryHistory} current={avg} />
        {/* Said once, where the number is, rather than in a tooltip nobody
            opens: this score is built from graded practice with help available,
            so it describes the practice and not what the student can do alone. */}
        <p className="text-xs text-muted mt-2">
          Scored from sessions you asked the companion to grade, hints and all — it tracks
          how practice is going, not what you can do unaided.
        </p>
      </Card>

      {/* Consistency */}
      <Card pad="sm">
        <h2 className="font-brand text-t3 font-semibold text-ink mb-3">Consistency · last 8 weeks</h2>
        <div className="overflow-x-auto">
          <ConsistencyGrid activity={app.activity} />
        </div>
      </Card>

      {/* Needs attention */}
      {weakest.length > 0 && (
        <Card pad="none" className="overflow-hidden">
          <h2 className="font-brand text-t3 font-semibold text-ink px-4 pt-4 pb-2">Worth another pass</h2>
          <div className="divide-y divide-border">
            {weakest.map((c) => {
              const pct = masteryPercent(c);
              const status = statusOf(pct);
              return (
                <div key={c.id} className="px-4 py-3 flex items-center gap-3 hover:bg-panel2 transition-colors">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${
                    status === 'bad' ? 'bg-bad' : status === 'warn' ? 'bg-warn' : 'bg-good'
                  }`} />
                  <span className="flex-1 text-xs text-ink truncate">{c.name}</span>
                  <span className="text-xs font-opmono tabular-nums text-muted">{pct}%</span>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      <ReportsAndHelp app={app} concepts={concepts} />
    </div>
  );
}

// ── Weekly report + a message to the people who run the club ─────────────────
function ReportsAndHelp({ app, concepts }) {
  const [report, setReport] = useState(null);
  const [genState, setGenState] = useState('idle');   // idle | busy | error
  const [genError, setGenError] = useState('');
  const [handoffState, setHandoffState] = useState('idle'); // idle | form | busy | sent | error
  // Whether the send actually reached anybody. A demo caller's message is
  // written nowhere and mailed to nobody (/api/handoff skips the whole block
  // when caller.demo is true), so the sent state must not promise a reader.
  const [handoffDelivered, setHandoffDelivered] = useState(true);
  const [note, setNote] = useState('');

  async function generate() {
    setGenState('busy'); setGenError('');
    try {
      const weakest = [...concepts]
        .filter((c) => c.lastQuality !== null)
        .sort((a, b) => masteryPercent(a) - masteryPercent(b))
        .slice(0, 5)
        .map((c) => ({ name: c.name, practiceScore: masteryPercent(c), reps: c.repetitions }));
      // The report writer only ever sees this object, so the field names ARE
      // the vocabulary of a document a parent reads. They say practice, for the
      // same reason the tab above does: nothing here is confirmed mastery.
      const stats = {
        student: app.profile?.name,
        streakDays: app.streak?.count || 0,
        totalSessions: concepts.reduce((n, c) => n + c.history.length, 0),
        avgPracticeScore: concepts.length ? Math.round(concepts.reduce((s2, c) => s2 + masteryPercent(c), 0) / concepts.length) : 0,
        conceptsTracked: concepts.length,
        conceptsScoringAbove75: concepts.filter((c) => masteryPercent(c) >= 75).length,
        weakestConcepts: weakest,
        homeworkDone: app.assignments.filter((a) => a.status === 'done').length,
        homeworkOpen: app.assignments.filter((a) => a.status === 'todo').length,
        courses: app.courses.map((c) => c.name),
      };
      logEvent('llm', 'Weekly report requested', `${concepts.length} concepts in snapshot`);
      const res = await limitedFetch('/api/reports/weekly', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stats }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setReport(data.report);
      setGenState('idle');
    } catch (e) {
      setGenError(e.message); setGenState('error');
    }
  }

  // Sends the note to /api/handoff, which stores it and mails the admin inbox.
  // It assigns nobody — see the card's comment below before rewording anything
  // here to sound like a booking.
  async function sendToKaizen() {
    setHandoffState('busy');
    try {
      const weakest = [...concepts]
        .filter((c) => c.lastQuality !== null)
        .sort((a, b) => masteryPercent(a) - masteryPercent(b))[0];
      const res = await limitedFetch('/api/handoff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseTitle: app.courses[0]?.name || '',
          concept: weakest?.name || '',
          urgency: 'normal',
          note,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      // Absent field = an older deploy that always delivered; treat only an
      // explicit false as "nobody got this".
      setHandoffDelivered(data.delivered !== false);
      setHandoffState('sent');
      logEvent('store', 'Message sent to Kaizen', weakest?.name || 'general');
    } catch {
      setHandoffState('error');
    }
  }

  return (
    <>
      {/* Weekly report */}
      <Card pad="sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="font-brand text-t3 font-semibold text-ink">Weekly report</h2>
            <p className="text-xs text-muted">A parent-friendly summary of your week, written from your real numbers.</p>
          </div>
          <Button variant="secondary" size="sm" className="shrink-0" onClick={generate} disabled={genState === 'busy'}>
            {genState === 'busy' ? 'Writing…' : report ? 'Regenerate' : 'Generate'}
          </Button>
        </div>
        {/* A failed generation is a failure, so it renders in the error channel. */}
        {genState === 'error' && <Notice kind="bad" className="mt-3">{genError}</Notice>}
        {report && (
          <div className="mt-3 bg-panel2 border border-border rounded-sm px-4 py-3 text-sm whitespace-pre-wrap text-ink max-h-80 overflow-y-auto">
            {report}
          </div>
        )}
      </Card>

      {/* What used to sit here was a live-video 1:1 booking block, mounted
          unconditionally with "Book a tutor" as its primary action. Private 1:1
          video is a cut product — Kaizen sells time in a room, in person — so a
          study screen may not offer it.

          WHAT REPLACED IT SAYS ONLY WHAT THE ENDPOINT DOES. POST /api/handoff
          writes a `human_handoff_requests` row and mails the admin inbox. It
          does not assign anybody: there is no bookable bench (the directory is
          gated shut on `marketplace_enabled` and answers empty), so copy that
          said "a Kaizen tutor can take over" named a class of person who cannot
          be dispatched — an offer of individual instruction on the same tab that
          just deleted the 1:1 block for being untrue. This is a message to the
          people who run the club, and it is worded as one. CLAIMS_MATRIX row 97
          is closed by this wording; do not re-promise a tutor here. */}

      {/* Message to Kaizen (async, read by a person) */}
      <Card pad="sm">
        {handoffState === 'sent' ? (
          <div className="text-center py-2">
            <div className="w-10 h-10 rounded-full bg-good/10 text-good flex items-center justify-center mx-auto mb-2">
              <IconCheck size={20} strokeWidth={2.2} />
            </div>
            <div className="text-sm font-semibold text-ink">
              {handoffDelivered ? 'Sent to Kaizen' : 'Not sent — this is a demo account'}
            </div>
            <p className="text-xs text-muted mt-1">
              {handoffDelivered
                ? 'Someone on the team will read it. Your weak concepts and recent work went with it, so you won\u2019t have to explain them again.'
                : 'A demo account has nowhere to send a message, so nothing was stored and nobody was emailed. Sign in with a real account and this reaches the people who run the club.'}
            </p>
          </div>
        ) : (
          <>
            <h2 className="font-brand text-t3 font-semibold text-ink">Stuck after real effort?</h2>
            <p className="text-xs text-muted mt-1">
              Tell us where you&apos;re stuck and someone from Kaizen will read it and follow up. Your weak concepts and recent work go with the message.
            </p>
            {handoffState === 'form' || handoffState === 'busy' || handoffState === 'error' ? (
              <div className="mt-3 space-y-2">
                <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2}
                  placeholder="What do you want help with? (optional)"
                  className="k-input resize-none text-sm" />
                {handoffState === 'error' && <Notice kind="bad">Could not send. Try again.</Notice>}
                <Button block onClick={sendToKaizen} disabled={handoffState === 'busy'}>
                  {handoffState === 'busy' ? 'Sending…' : 'Send to Kaizen'}
                </Button>
              </div>
            ) : (
              <Button variant="secondary" block className="mt-3" onClick={() => setHandoffState('form')}>
                Send this to Kaizen
              </Button>
            )}
          </>
        )}
      </Card>
    </>
  );
}
