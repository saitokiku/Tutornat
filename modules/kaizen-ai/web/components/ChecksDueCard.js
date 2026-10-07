'use client';

// "Checks ready" — the entry point to the only thing that confirms mastery.
//
// This is the highest-risk surface in the whole engine. Students currently tap
// "Grade" and get a number instantly; now there's a short unaided check, later.
// If they don't do it, confirmed mastery stays empty and the engine's central
// claim goes unrealised. So the framing matters:
//
//   - it is short and says so (two minutes, three questions)
//   - it explains WHY it's delayed, once, rather than nagging
//   - it never guilts, never counts a streak, never compares to anyone else
//   - it leads with what the learner gets: proof that holds up
//
// Adherence is the open question the research is clearest about — instruction
// isn't the bottleneck, showing up is — and no amount of copy fixes it alone.
// The booked tutor session is the other half of that answer.

import { useState, useEffect } from 'react';
import { authedFetch } from '@/lib/supabaseClient';
import CheckFlow from '@/components/CheckFlow';
import PracticeSession from '@/components/PracticeSession';
import DropInSessions from '@/components/DropInSessions';
import { IconCheck, IconBook, IconCalendar, IconArrowRight, IconChevronRight } from '@/components/Icons';
import { RETAIL, formatPrice as dollars } from '@/lib/server/clubPricing';

export default function ChecksDueCard({ onConfirmed }) {
  const [due, setDue] = useState(null);      // null = loading, [] = none
  const [minutes, setMinutes] = useState(2);
  const [active, setActive] = useState(null); // { kcId, title }
  const [practising, setPractising] = useState(false);
  const [dropIn, setDropIn] = useState(false);

  async function load() {
    try {
      const r = await authedFetch('/api/engine/check');
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { setDue([]); return; }
      setDue(d.due || []);
      setMinutes(d.estimatedMinutes || 2);
    } catch {
      setDue([]);
    }
  }

  useEffect(() => { load(); }, []);

  // Even with nothing due, the practice loop is reachable — the engine decides
  // what to serve, so an empty check queue is not an empty session.
  if (due === null) return null;
  if (due.length === 0) {
    return (
      <>
        <section className="k-card p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-sm bg-accent/10 text-accent flex items-center justify-center shrink-0">
            <IconBook size={17} />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-t3 font-semibold text-ink">Practice</h2>
            <p className="text-xs text-muted mt-0.5">
              Nothing due. A short session picks up where you left off.
            </p>
          </div>
          <button onClick={() => setPractising(true)} className="k-btn-primary px-4 py-2 text-sm shrink-0">Start</button>
        </section>
        <DropInPrompt onOpen={() => setDropIn(true)} />

        {practising && <PracticeSession onClose={() => { setPractising(false); load(); }} onProgress={onConfirmed} />}
        {dropIn && <DropInSessions onClose={() => setDropIn(false)} />}
      </>
    );
  }

  return (
    <>
      <section className="k-card p-4">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-sm bg-good/10 text-good flex items-center justify-center shrink-0">
            <IconCheck size={17} />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-t3 font-semibold text-ink">
              <span className="font-opmono tabular-nums">{due.length}</span>{' '}
              {due.length === 1 ? 'check' : 'checks'} ready
              <span className="text-muted font-normal"> · about <span className="font-opmono tabular-nums">{minutes}</span> min</span>
            </h2>
            <p className="text-xs text-muted mt-0.5">
              No hints, no notes. This is where progress becomes something you can point at.
            </p>
          </div>
        </div>

        <div className="mt-4 space-y-1.5">
          {due.slice(0, 4).map((d) => (
            <button key={d.kcId}
              onClick={() => setActive({ kcId: d.kcId, title: d.title })}
              className="w-full flex items-center gap-3 rounded-sm border border-border bg-panel2 hover:border-ink/25 px-3 py-2.5 text-left transition-colors">
              <span className="text-sm text-ink flex-1 truncate">{d.title}</span>
              <span className="font-opmono text-xs text-muted tabular-nums shrink-0">
                {Math.round((d.working || 0) * 100)}% with help
              </span>
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-accent shrink-0">
                Check <IconArrowRight size={13} />
              </span>
            </button>
          ))}
          {due.length > 4 && (
            <p className="text-xs text-muted px-1 pt-0.5">
              and <span className="font-opmono tabular-nums">{due.length - 4}</span> more
            </p>
          )}
          <button onClick={() => setPractising(true)}
            className="w-full text-xs font-semibold text-accent py-2 hover:underline underline-offset-2">
            or practise something new
          </button>
        </div>
      </section>

      <DropInPrompt onOpen={() => setDropIn(true)} />

      {practising && <PracticeSession onClose={() => { setPractising(false); load(); }} onProgress={onConfirmed} />}
      {dropIn && <DropInSessions onClose={() => setDropIn(false)} />}

      {active && (
        <CheckFlow
          kcId={active.kcId}
          title={active.title}
          onClose={() => { setActive(null); load(); }}
          onComplete={(r) => { onConfirmed?.(r); }}
        />
      )}
    </>
  );
}

// Stuck-with-a-human is one tap from Today. The club schedule: Homework Hall,
// Subject Clinics, and the weekly free Community Hall.
//
// The Hall price is READ from clubPricing, never typed: this card advertised a
// retired "from" figure two dollars under the real seat price (audit
// 2026-08-18, H7) on the highest-traffic in-app surface in the product.
// clubPricing.js is pure data with no secrets and no I/O, so
// client surfaces import it directly — the same thing /billing and the public
// tutor profile already do.
function DropInPrompt({ onOpen }) {
  return (
    <button onClick={onOpen}
      className="w-full mt-3 k-card p-4 flex items-center gap-3 text-left hover:border-accent/40 transition-colors">
      <div className="w-9 h-9 rounded-sm bg-accent/10 text-accent flex items-center justify-center shrink-0">
        <IconCalendar size={17} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold text-ink">Homework Hall and clinics, this week</div>
        <div className="text-xs text-muted mt-0.5">
          Real tutors after school. Free Community Hall every week; Homework Hall{' '}
          <span className="font-opmono tabular-nums">{dollars(RETAIL.hallSeatCents)}</span> a visit.
        </div>
      </div>
      <IconChevronRight size={16} className="text-muted shrink-0" />
    </button>
  );
}
