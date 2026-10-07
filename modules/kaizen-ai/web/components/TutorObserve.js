'use client';

// The tutor's structured read on a session: the missing edge in the harmony loop.
//
// Until now a tutor's only pedagogical input was a free-text box whose output
// went to an email and a column nothing reads. Forty-five minutes of a trained
// human watching a student work unaided produced zero bits of learning state.
//
// Each rating here becomes evidence with verified_by='human_tutor' and
// assisted=false, a CONFIRMING class, because a human watching someone work is
// the strongest signal the system can get. It moves confirmed mastery, reschedules
// the concept, feeds the AI's next session, and schedules a delayed unassisted
// check that measures whether this session actually worked.
//
// HARD CONSTRAINT: three taps for a three-concept session. A tutor who finds
// this slow won't do it, and an unused channel is the same as no channel, so
// notes are optional, misconception tagging is optional, and the rating itself
// is one tap with no confirmation step. Nothing below adds a step, a
// confirmation, or a required field.
//
// Restyled onto the one system (docs/superpowers/specs/2026-08-22-one-system-rebuild.md):
// one type scale, one radius scale, tokens only, and the record figures (the
// working/confirmed gap, the rated counter) set in mono with tabular numerals
// so a tutor can read down them. Behavior is untouched: same hooks, same fetch,
// same states, and notProvisioned still renders null on purpose.

import { useState, useEffect } from 'react';
import { authedFetch } from '@/lib/supabaseClient';
import Button from '@/components/ui/Button';

const RATINGS = [
  { id: 'got_it', label: 'Got it', tone: 'text-good border-good/40 bg-good/10' },
  { id: 'shaky', label: 'Shaky', tone: 'text-warn border-warn/40 bg-warn/10' },
  { id: 'not_yet', label: 'Not yet', tone: 'text-bad border-bad/40 bg-bad/10' },
];

export default function TutorObserve({ sessionId, onSaved }) {
  const [state, setState] = useState({ loading: true });
  const [ratings, setRatings] = useState({});      // kcId -> rating
  const [misconceptions, setMisconceptions] = useState({}); // kcId -> misconceptionId
  const [notes, setNotes] = useState({});
  const [expanded, setExpanded] = useState(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    let alive = true;
    authedFetch(`/api/tutoring/observe?sessionId=${sessionId}`)
      .then(async (r) => {
        const d = await r.json().catch(() => ({}));
        if (!alive) return;
        if (!r.ok) { setState({ loading: false, error: d.error || 'Could not load.' }); return; }
        setState({ loading: false, ...d });
        // Preload anything already recorded so a reopened card isn't blank.
        const pre = {};
        for (const a of d.agenda || []) if (a.rating) pre[a.kcId] = a.rating;
        setRatings(pre);
      })
      .catch(() => { if (alive) setState({ loading: false, error: 'Could not load.' }); });
    return () => { alive = false; };
  }, [sessionId]);

  async function save() {
    const observations = Object.entries(ratings).map(([kcId, rating]) => ({
      kcId, rating,
      misconceptionId: misconceptions[kcId] || null,
      note: notes[kcId] || null,
    }));
    if (!observations.length) return;
    setBusy(true); setMsg('');
    try {
      const r = await authedFetch('/api/tutoring/observe', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, observations }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { setMsg(d.error || 'Could not save.'); return; }
      setMsg(`Saved. ${d.recorded} concept${d.recorded === 1 ? '' : 's'} updated. We'll check them again in a day or two.`);
      onSaved?.(d);
    } finally {
      setBusy(false);
    }
  }

  if (state.loading) return <p className="px-1 py-2 text-xs text-muted">Loading their concepts…</p>;
  // The engine schema isn't applied on this deployment yet. Say nothing rather
  // than show a tutor an error they can't act on.
  if (state.notProvisioned) return null;
  if (state.error) return <p className="px-1 py-2 text-xs text-bad">{state.error}</p>;

  const agenda = state.agenda || [];
  if (!agenda.length) {
    return (
      <p className="px-1 py-2 text-xs text-muted leading-relaxed">
        No concepts linked to this session yet. The student books against specific
        concepts once their course is mapped.
      </p>
    );
  }

  const rated = Object.keys(ratings).length;

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-sm font-semibold text-ink">How did each one go?</p>
        <span className="font-opmono text-xs tabular-nums text-muted shrink-0">{rated}/{agenda.length}</span>
      </div>

      {agenda.map((a) => {
        const miscForKc = (state.misconceptions || []).filter((m) => m.kcId === a.kcId);
        const open = expanded === a.kcId;
        return (
          <div key={a.kcId} className="rounded-md border border-border bg-panel p-3">
            <div className="flex items-center gap-2 mb-2">
              <span className="flex-1 truncate text-sm font-medium text-ink">{a.title}</span>
              {/* The numbers the tutor never used to see. The GAP between
                  working and confirmed is the diagnosis. */}
              {a.working != null && (
                <span className="font-opmono text-xs tabular-nums text-muted shrink-0">
                  {Math.round(a.working * 100)}% w / {Math.round((a.confirmed || 0) * 100)}% c
                </span>
              )}
              {a.dependencyAlarm || a.flagged ? (
                <span title="Help demand isn't falling here" className="k-badge k-badge-warn shrink-0">leaning</span>
              ) : null}
            </div>

            <div className="flex gap-1.5">
              {RATINGS.map((r) => (
                <button key={r.id}
                  onClick={() => { setRatings((p) => ({ ...p, [a.kcId]: r.id })); setExpanded(a.kcId); }}
                  className={`flex-1 rounded-sm border py-2 text-xs font-semibold transition-colors ${
                    ratings[a.kcId] === r.id ? r.tone : 'border-border text-muted hover:text-ink hover:border-ink/25'
                  }`}>
                  {r.label}
                </button>
              ))}
            </div>

            {/* Optional detail. Naming the real blocker is what turns a session
                into labelled data the AI can use for every other student. */}
            {open && ratings[a.kcId] && ratings[a.kcId] !== 'got_it' && (
              <div className="mt-2 space-y-1.5">
                {miscForKc.length > 0 && (
                  <select
                    value={misconceptions[a.kcId] || ''}
                    onChange={(e) => setMisconceptions((p) => ({ ...p, [a.kcId]: e.target.value }))}
                    className="k-input px-3 py-2 text-xs">
                    <option value="">What was the actual blocker? (optional)</option>
                    {miscForKc.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
                  </select>
                )}
                <input
                  value={notes[a.kcId] || ''}
                  onChange={(e) => setNotes((p) => ({ ...p, [a.kcId]: e.target.value }))}
                  placeholder="Anything the AI should know (optional)"
                  className="k-input px-3 py-2 text-xs" />
              </div>
            )}
          </div>
        );
      })}

      <div className="flex items-center gap-3 pt-1">
        <Button size="sm" onClick={save} disabled={busy || !rated}>
          {busy ? 'Saving…' : 'Save what you saw'}
        </Button>
        {msg && <span className="flex-1 text-xs text-muted">{msg}</span>}
      </div>
      <p className="text-xs text-muted leading-relaxed">
        This updates what they can do <em>on their own</em>. It is the strongest signal we
        have, because you watched them work.
      </p>
    </div>
  );
}
