'use client';

// The practice surface — the engine's loop made visible. Spec §4.1 F-2/F-3/F-4/F-7.
//
// What the learner sees is decided entirely server-side: which rung of the
// ladder, which item, whether hints exist. The client renders and reports; it
// never grades, never holds an answer key, and never decides what counts.
//
// Copy rules throughout (§4.1 F-8, §11.6): task and process level only. No
// person-praise, no shame, no normative comparison, no guilt. A third of all
// feedback interventions make performance worse, and self-level feedback is the
// reliably harmful category — so "Correct." rather than "You're so smart!", and
// "we'll come back to this" rather than "you got it wrong again".

import { useState, useEffect, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import { IconX, IconSprout, IconLeaf } from '@/components/Icons';
import { authedFetch } from '@/lib/supabaseClient';

const MessageBody = dynamic(() => import('@/components/MessageBody'), {
  ssr: false, loading: () => <span className="opacity-40">…</span>,
});

export default function PracticeSession({ onClose, onProgress }) {
  const [sessionId, setSessionId] = useState(null);
  const [activity, setActivity] = useState(null);
  const [phase, setPhase] = useState('loading');   // loading | active | ended | unavailable | error
  const [error, setError] = useState('');
  const [draft, setDraft] = useState('');
  const [choice, setChoice] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [hint, setHint] = useState(null);
  const [explainResult, setExplainResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [summary, setSummary] = useState(null);
  const [reported, setReported] = useState(false);
  const startedAt = useRef(Date.now());

  const load = useCallback(async (sid) => {
    setBusy(true);
    try {
      const q = sid ? `?sessionId=${encodeURIComponent(sid)}` : '';
      const r = await authedFetch(`/api/engine/session${q}`);
      const d = await r.json().catch(() => ({}));
      if (d.notProvisioned || d.demo) { setPhase('unavailable'); return; }
      if (!r.ok) { setError(d.error || 'Could not load.'); setPhase('error'); return; }

      setSessionId(d.sessionId);
      if (d.action === 'end_session' || d.action === 'all_confirmed') {
        setSummary({ reason: d.reason, message: d.message });
        setPhase('ended');
        return;
      }
      if (d.action === 'needs_placement') { setPhase('needs_placement'); return; }

      setActivity(d);
      setFeedback(null); setHint(null); setDraft(''); setChoice(null); setExplainResult(null);
      setReported(false);
      setPhase('active');
      startedAt.current = Date.now();
    } catch {
      setError('Could not load your session.');
      setPhase('error');
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => { load(null); }, [load]);

  async function post(payload) {
    const r = await authedFetch('/api/engine/session', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, ...payload }),
    });
    return { ok: r.ok, data: await r.json().catch(() => ({})) };
  }

  async function answer() {
    if (busy || !activity?.attemptId) return;
    setBusy(true);
    const response = activity.item?.kind === 'mc'
      ? { choice, latencyMs: Date.now() - startedAt.current }
      : { text: draft, latencyMs: Date.now() - startedAt.current };
    const { ok, data } = await post({ action: 'answer', attemptId: activity.attemptId, response });
    setBusy(false);
    if (!ok) { setError(data.error || 'Could not submit.'); return; }
    setFeedback(data);
    if (data.estimate) onProgress?.(data.estimate);
  }

  async function getHint() {
    if (busy) return;
    setBusy(true);
    const { ok, data } = await post({ action: 'hint', attemptId: activity.attemptId });
    setBusy(false);
    if (!ok) { setHint({ body: data.error, soft: true }); return; }
    setHint(data);
    setActivity((a) => ({ ...a, hints: data.hints }));
  }

  async function explain(idx) {
    const { data } = await post({ action: 'explain', contentId: activity.selfExplain.id, choice: idx });
    setExplainResult({ ...data, picked: idx });
  }

  async function report() {
    await post({ action: 'report', contentId: activity?.content?.id || null, itemId: activity?.item?.id || null });
    setReported(true);
  }

  async function finish(reason = 'learner') {
    await post({ action: 'end', reason });
    onClose?.();
  }

  // ── States ────────────────────────────────────────────────────────────────

  if (phase === 'loading') return <Shell onClose={onClose}><p className="text-sm text-muted py-12 text-center">Working out what’s next…</p></Shell>;

  if (phase === 'unavailable') {
    return (
      <Shell onClose={onClose}>
        <div className="py-10 text-center space-y-3">
          <div className="flex justify-center text-muted"><IconSprout size={28} /></div>
          <p className="text-sm text-muted">Practice isn’t switched on for this account yet.</p>
        </div>
      </Shell>
    );
  }

  if (phase === 'needs_placement') {
    return (
      <Shell onClose={onClose}>
        <div className="py-10 text-center space-y-3">
          <p className="text-t3 font-semibold text-ink">Let’s find your starting point</p>
          <p className="text-sm text-muted max-w-narrow mx-auto">
            A few quick questions. No grade, no score. It just tells us where to begin
            so nothing is a waste of your time.
          </p>
        </div>
      </Shell>
    );
  }

  if (phase === 'error') {
    return <Shell onClose={onClose}><p className="text-sm text-bad py-10 text-center">{error}</p></Shell>;
  }

  if (phase === 'ended') {
    return (
      <Shell onClose={onClose}>
        <div className="py-10 text-center space-y-3">
          <div className="flex justify-center text-accent"><IconLeaf size={28} /></div>
          <p className="text-t3 font-semibold text-ink">
            {summary?.reason === 'hard_cap' ? 'Good place to stop.' : 'Nothing due right now.'}
          </p>
          <p className="text-sm text-muted max-w-narrow mx-auto">
            {summary?.message || 'Spacing does the rest. Things come back right before you’d forget them.'}
          </p>
          <button onClick={() => finish('learner')} className="k-btn-primary px-6 py-2.5 text-sm">Done</button>
        </div>
      </Shell>
    );
  }

  // ── Worked example + self-explanation (F-7) ───────────────────────────────
  if (activity?.action === 'worked_example') {
    return (
      <Shell onClose={onClose} title={activity.title} subtitle="Worked example">
        <div className="text-body"><MessageBody content={activity.content.body} /></div>

        {activity.selfExplain && (
          <div className="mt-5 rounded-md bg-panel2 border border-border p-4">
            <p className="text-sm font-semibold text-ink mb-3">{activity.selfExplain.body}</p>
            <div className="space-y-1.5">
              {activity.selfExplain.choices.map((c, i) => (
                <button key={i} onClick={() => !explainResult && explain(i)} disabled={!!explainResult}
                  className={`w-full text-left rounded-sm border px-3.5 py-2.5 text-sm transition-colors ${
                    explainResult?.picked === i
                      ? (explainResult.correct ? 'border-good bg-good/10 text-ink' : 'border-warn bg-warn/10 text-ink')
                      : 'border-border bg-panel hover:border-ink/30 text-ink'
                  }`}>
                  {c}
                </button>
              ))}
            </div>
            {explainResult && (
              <p className="text-xs text-muted mt-3">{explainResult.feedback}</p>
            )}
          </div>
        )}

        <div className="mt-5 flex items-center gap-2">
          <button onClick={() => load(sessionId)} disabled={busy}
            className="k-btn-primary flex-1 py-2.5 text-sm">Try one myself</button>
        </div>
        <div className="mt-3">
          <ReportLink reported={reported} onReport={report} />
        </div>
      </Shell>
    );
  }

  // ── An item ───────────────────────────────────────────────────────────────
  const item = activity?.item;
  const answered = item?.kind === 'mc' ? choice != null : draft.trim().length > 0;
  const hints = activity?.hints || {};

  return (
    <Shell
      onClose={onClose}
      title={activity?.title}
      subtitle={activity?.independentBlock ? 'On your own · no hints' : activity?.because === 'isomorph' ? 'One more like it' : 'Practice'}
    >
      {activity?.independentBlock && (
        <div className="mb-4 rounded-sm bg-good/10 border border-good/30 px-3.5 py-2.5 text-xs text-ink">
          Show what’s yours. No hints on this one, and that is what makes it count.
        </div>
      )}

      <p className="text-body font-medium text-ink">{item?.body}</p>

      {item?.kind === 'mc' ? (
        <div className="space-y-2 mt-4">
          {(item.choices || []).map((c, i) => (
            <button key={i} onClick={() => !feedback && setChoice(i)} disabled={!!feedback}
              className={`w-full text-left rounded-sm border px-3.5 py-2.5 text-sm text-ink transition-colors ${
                choice === i ? 'border-accent bg-accent/5' : 'border-border hover:border-ink/30'
              }`}>
              {c}
            </button>
          ))}
        </div>
      ) : (
        <textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={2} disabled={!!feedback}
          placeholder="Your answer…" autoFocus
          className="k-input mt-4 bg-panel2 py-2.5 text-sm resize-none disabled:opacity-60" />
      )}

      {hint && (
        <div className={`mt-3 rounded-sm px-3.5 py-2.5 text-sm ${hint.soft ? 'bg-panel2 border border-border text-muted' : 'bg-accent/10 border border-accent/20 text-ink'}`}>
          <MessageBody content={hint.body} />
          {hint.note && <p className="text-xs text-muted mt-1.5">{hint.note}</p>}
        </div>
      )}

      {feedback && (
        <div className={`mt-3 rounded-sm border px-3.5 py-2.5 text-sm text-ink ${
          feedback.correct ? 'bg-good/10 border-good/30' : 'bg-warn/10 border-warn/30'
        }`}>
          {feedback.feedback?.label && (
            <p className="k-label text-warn mb-1">{feedback.feedback.label}</p>
          )}
          <MessageBody content={feedback.feedback?.body || (feedback.correct ? 'Correct.' : 'Not quite.')} />
        </div>
      )}

      <div className="mt-5 flex items-center gap-2">
        {!feedback ? (
          <>
            <button onClick={answer} disabled={!answered || busy}
              className="k-btn-primary flex-1 py-2.5 text-sm disabled:opacity-40">Check</button>
            {hints.available && (
              <button onClick={getHint} disabled={busy}
                className="k-btn-secondary px-4 py-2.5 text-sm">
                {hints.next === 'solution' ? 'Show me' : 'Hint'}
              </button>
            )}
          </>
        ) : (
          <button onClick={() => load(sessionId)} disabled={busy}
            className="k-btn-primary flex-1 py-2.5 text-sm">
            {feedback.resolved ? 'Next' : 'Try again'}
          </button>
        )}
      </div>

      {/* No hint available yet — say why, as teaching rather than a refusal. */}
      {!feedback && !hints.available && hints.reason === 'attempt_required' && (
        <p className="text-xs text-muted mt-3 text-center">
          Have a go first. Even a wrong attempt makes the hint land better.
        </p>
      )}

      <div className="mt-5 pt-3 border-t border-border flex items-center justify-between gap-3">
        <ReportLink reported={reported} onReport={report} />
        <button onClick={() => finish('learner')} className="text-xs text-muted hover:text-ink transition-colors">
          Stop for now
        </button>
      </div>
    </Shell>
  );
}

function ReportLink({ reported, onReport }) {
  return reported
    ? <span className="text-xs text-muted">Thanks, we’ll check that.</span>
    : <button onClick={onReport} className="text-xs text-muted hover:text-ink transition-colors">This looks wrong</button>;
}

function Shell({ children, onClose, title, subtitle }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-ink/30 backdrop-blur-sm p-0 sm:p-5"
      onClick={onClose}>
      <div className="w-full max-w-md bg-panel rounded-t-lg sm:rounded-lg border border-border shadow-lift p-5 sm:p-6 max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="min-w-0">
            {title && <h2 className="text-t2 font-semibold text-ink truncate">{title}</h2>}
            {subtitle && <p className="k-label mt-1">{subtitle}</p>}
          </div>
          <button onClick={onClose} aria-label="Close"
            className="w-8 h-8 rounded-full bg-panel2 text-muted hover:text-ink transition-colors flex items-center justify-center shrink-0"><IconX size={14} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}
