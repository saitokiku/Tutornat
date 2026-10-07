'use client';

// The Community Hall vote board — one shared feed rendered beside the live
// video call. Students drop questions; the server's fast-tier router merges
// them into "parties" and ranks the board by distinct voters. The tutor works
// the top of the list and marks parties covered as the room clears them.
//
// This component never holds optimistic state: every mutation returns the
// fresh board and we render exactly what the server said. A 5s poll keeps
// everyone's board in sync (skipped while our own POST is in flight so the
// response we render is the freshest one).
//
// Restyled onto the one system (spec: 2026-08-22-one-system-rebuild.md). The
// rail sits on paper like the rest of the interior; the vote tally is mono and
// tabular because it is the figure the board ranks on, and the ask button is
// the same ink pill as every other primary action in the product.

import { useState, useEffect, useRef, useCallback } from 'react';
import { authedFetch } from '@/lib/supabaseClient';
import Button from '@/components/ui/Button';
import Notice from '@/components/ui/Notice';

export default function HallBoard({ sessionId, role = 'student' }) {
  const [board, setBoard] = useState(null); // {totalStudents, parties} from the server
  const [error, setError] = useState('');
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);      // POST in flight
  const [marking, setMarking] = useState(null); // topicId of an in-flight PATCH
  const [expanded, setExpanded] = useState({}); // partyId -> show all asks
  const postingRef = useRef(false);

  const load = useCallback(async () => {
    if (postingRef.current) return; // the POST response will carry the fresh board
    try {
      const r = await authedFetch(`/api/tutoring/hall?sessionId=${encodeURIComponent(sessionId)}`);
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { setError(d.error || 'Could not load the board.'); return; }
      setError('');
      setBoard(d);
    } catch {
      setError('Could not load the board.');
    }
  }, [sessionId]);

  useEffect(() => {
    load();
    const timer = setInterval(load, 5000);
    return () => clearInterval(timer);
  }, [load]);

  async function submit() {
    const clean = text.trim();
    if (!clean || postingRef.current) return;
    postingRef.current = true;
    setBusy(true); setError('');
    try {
      const r = await authedFetch('/api/tutoring/hall', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, text: clean }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { setError(d.error || 'Could not send that. Try again.'); return; }
      setText('');
      setBoard(d);
    } catch {
      setError('Could not send that. Try again.');
    } finally {
      postingRef.current = false;
      setBusy(false);
    }
  }

  async function setStatus(topicId, status) {
    if (marking) return;
    setMarking(topicId); setError('');
    try {
      const r = await authedFetch('/api/tutoring/hall', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, topicId, status }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { setError(d.error || 'Could not update that topic.'); return; }
      setBoard(d);
    } catch {
      setError('Could not update that topic.');
    } finally {
      setMarking(null);
    }
  }

  const parties = board?.parties || [];
  const total = board?.totalStudents || 0;

  return (
    <div className="space-y-4 p-4">
      <div>
        <h3 className="font-brand text-t3 font-semibold text-ink">Room board</h3>
        <p className="mt-1 text-xs text-muted">
          {role === 'tutor'
            ? 'Questions from the room, hottest first. Mark a party covered as you clear it.'
            : 'Ask anything. Questions like yours get grouped, and the biggest groups get covered first.'}
        </p>
      </div>

      {role === 'student' && (
        <div className="space-y-2">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); } }}
            rows={2} maxLength={300}
            placeholder="Drop a question for the room"
            className="k-input resize-none px-3 py-2 text-sm"
          />
          <Button size="sm" onClick={submit} disabled={busy || !text.trim()}>
            {busy ? 'Sending…' : 'Ask the room'}
          </Button>
        </div>
      )}

      {error && <Notice kind="bad">{error}</Notice>}

      {board === null && !error && (
        <p className="py-4 text-center text-sm text-muted">Loading the board…</p>
      )}

      {board !== null && parties.length === 0 && (
        <p className="py-4 text-center text-sm text-muted">
          No questions yet. Ask the first one.
        </p>
      )}

      {parties.length > 0 && (
        <div className="space-y-2">
          {parties.map((p) => {
            const covered = p.status === 'covered';
            const asks = p.asks || [];
            const showAll = Boolean(expanded[p.id]);
            const visible = showAll ? asks : asks.slice(0, 2);
            const hidden = asks.length - visible.length;
            return (
              <div key={p.id}
                className={`rounded-sm border border-border bg-panel2 p-3 ${covered ? 'opacity-50' : ''}`}>
                <div className="flex items-start gap-2">
                  <span className={`min-w-0 flex-1 text-xs font-semibold ${covered ? 'text-muted line-through' : 'text-ink'}`}>
                    {p.title}
                  </span>
                  {/* The tally is the figure the board ranks on, so it is mono. */}
                  <span className="shrink-0 rounded-full bg-accent/10 px-2 py-0.5 font-opmono text-xs font-semibold tabular-nums text-accent">
                    {p.voters} of {total}
                  </span>
                </div>

                {visible.length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {visible.map((a, i) => (
                      <li key={i} className="border-l-2 border-border pl-2 text-xs text-muted">
                        {a.text}
                      </li>
                    ))}
                  </ul>
                )}
                {(hidden > 0 || showAll) && asks.length > 2 && (
                  <button type="button" onClick={() => setExpanded((v) => ({ ...v, [p.id]: !showAll }))}
                    className="mt-1.5 text-xs font-semibold text-accent underline-offset-4 hover:underline">
                    {showAll ? 'Show fewer' : `+${hidden} more`}
                  </button>
                )}

                {role === 'tutor' && (
                  <div className="mt-2">
                    <button type="button" onClick={() => setStatus(p.id, covered ? 'open' : 'covered')}
                      disabled={marking === p.id}
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold transition-colors disabled:opacity-40 ${covered ? 'bg-panel text-muted hover:text-ink' : 'bg-good/10 text-good hover:bg-good/20'}`}>
                      {marking === p.id ? 'Saving…' : covered ? 'Reopen' : 'Mark covered'}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
