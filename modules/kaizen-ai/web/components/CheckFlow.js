'use client';

// The check: a short, hint-free, server-graded retrieval attempt.
// This is the ONLY thing in the product that produces confirmed mastery.
//
// Differences from PracticeModal that are not cosmetic:
//   - no answer key is ever in this component's memory; the server grades
//   - nothing is self-marked; the learner's claim is not an input to correctness
//   - no hints, by construction — that is what makes the evidence unassisted
//   - a prediction is collected before each answer (free calibration training,
//     and novices are systematically overconfident until retrieval corrects them)
//
// Tone rules, from the feedback literature: task and process level only. No
// person-praise ("you're so smart"), no normative comparison. A third of all
// feedback interventions make performance WORSE, and self-level feedback is the
// reliably harmful category.

import { useState, useEffect, useRef } from 'react';
import { authedFetch } from '@/lib/supabaseClient';
import { IconX, IconSprout } from '@/components/Icons';

export default function CheckFlow({ kcId, title, onClose, onComplete }) {
  const [phase, setPhase] = useState('loading'); // loading | predict | answer | grading | done | error | notyet
  const [error, setError] = useState('');
  const [attemptId, setAttemptId] = useState(null);
  const [items, setItems] = useState([]);
  const [idx, setIdx] = useState(0);
  const [responses, setResponses] = useState({});
  const [prediction, setPrediction] = useState(null);
  const [draft, setDraft] = useState('');
  const [choice, setChoice] = useState(null);
  const [result, setResult] = useState(null);
  // The server resumes an outstanding attempt instead of minting a new one
  // (engine/check issueCheck) — say so, or the reload looks like a fresh draw.
  const [resumed, setResumed] = useState(false);
  const startedAt = useRef(Date.now());

  useEffect(() => {
    let alive = true;
    authedFetch(`/api/engine/check?kcId=${encodeURIComponent(kcId)}`)
      .then(async (r) => {
        const d = await r.json().catch(() => ({}));
        if (!alive) return;
        if (r.status === 425) { setError(d.message || 'Not yet.'); setPhase('notyet'); return; }
        if (!r.ok) { setError(d.message || d.error || 'Could not start this check.'); setPhase('error'); return; }
        setAttemptId(d.attemptId);
        setItems(d.items || []);
        setResumed(Boolean(d.resumed));
        setPhase('predict');
        startedAt.current = Date.now();
      })
      .catch(() => { if (alive) { setError('Could not start this check.'); setPhase('error'); } });
    return () => { alive = false; };
  }, [kcId]);

  const item = items[idx];
  const total = items.length;

  function recordAndAdvance() {
    const latencyMs = Date.now() - startedAt.current;
    const response = { predictedCorrect: prediction, latencyMs };
    if (item.kind === 'mc') response.choice = choice;
    else response.text = draft;

    const next = { ...responses, [item.id]: response };
    setResponses(next);

    if (idx + 1 < total) {
      setIdx(idx + 1);
      setPrediction(null); setDraft(''); setChoice(null);
      setPhase('predict');
      startedAt.current = Date.now();
    } else {
      submit(next);
    }
  }

  async function submit(finalResponses) {
    setPhase('grading');
    try {
      const res = await authedFetch('/api/engine/check', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attemptId, responses: finalResponses }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { setError(d.error || 'Could not grade this.'); setPhase('error'); return; }
      setResult(d);
      setPhase('done');
      onComplete?.(d);
    } catch {
      setError('Could not submit your answers.');
      setPhase('error');
    }
  }

  const answered = item?.kind === 'mc' ? choice != null : draft.trim().length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-ink/30 backdrop-blur-sm p-0 sm:p-5" onClick={onClose}>
      <div className="w-full max-w-md bg-panel rounded-t-lg sm:rounded-lg border border-border shadow-lift p-5 sm:p-6 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}>

        <div className="flex items-start justify-between gap-3 mb-1">
          <div className="min-w-0">
            <h2 className="text-t2 font-semibold text-ink">Check · {title}</h2>
            {['predict', 'answer'].includes(phase) && (
              <p className="text-xs text-muted mt-1">
                Question <span className="font-opmono tabular-nums">{idx + 1}</span> of{' '}
                <span className="font-opmono tabular-nums">{total}</span> · no hints
                {resumed && ' · picking up your unfinished check'}
              </p>
            )}
          </div>
          <button onClick={onClose} aria-label="Close"
            className="w-8 h-8 rounded-full bg-panel2 text-muted hover:text-ink transition-colors flex items-center justify-center shrink-0"><IconX size={14} /></button>
        </div>

        {phase === 'loading' && <p className="text-sm text-muted py-10 text-center">Setting up…</p>}

        {phase === 'notyet' && (
          <div className="py-8 text-center space-y-3">
            <div className="flex justify-center text-muted"><IconSprout size={28} /></div>
            <p className="text-sm text-muted">{error}</p>
            <button onClick={onClose} className="k-btn-secondary px-6 py-2.5 text-sm">Got it</button>
          </div>
        )}

        {phase === 'error' && (
          <div className="py-8 text-center">
            <p className="text-sm text-bad">{error}</p>
            <button onClick={onClose} className="mt-4 k-btn-secondary px-6 py-2.5 text-sm">Close</button>
          </div>
        )}

        {/* Predict-then-check. Costs nothing, trains calibration, and the
            prediction/outcome gap is itself a metric worth having. */}
        {phase === 'predict' && item && (
          <div className="space-y-4 pt-4">
            <p className="text-body font-medium text-ink">{item.body}</p>
            <div className="rounded-md bg-panel2 border border-border px-4 py-3.5">
              <p className="text-sm font-semibold text-ink mb-2.5">Before you answer, will you get this right?</p>
              <div className="flex gap-2">
                {[['Yes', true], ['Not sure', false]].map(([label, val]) => (
                  <button key={label}
                    onClick={() => { setPrediction(val); setPhase('answer'); }}
                    className="k-btn-secondary flex-1 py-2.5 text-sm">
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {phase === 'answer' && item && (
          <div className="space-y-3 pt-4">
            <p className="text-body font-medium text-ink">{item.body}</p>

            {item.kind === 'mc' ? (
              <div className="space-y-2">
                {(item.choices || []).map((c, i) => (
                  <button key={i} onClick={() => setChoice(i)}
                    className={`w-full text-left rounded-sm border px-3.5 py-2.5 text-sm text-ink transition-colors ${
                      choice === i ? 'border-accent bg-accent/5' : 'border-border hover:border-ink/30'
                    }`}>
                    {c}
                  </button>
                ))}
              </div>
            ) : (
              <textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={3}
                placeholder="Your answer…" autoFocus
                className="k-input bg-panel2 py-2.5 text-sm resize-none" />
            )}

            {/* No "reveal answer". There is nothing to reveal — the key is on
                the server, and revealing it here is how the old flow became
                self-marking. */}
            <button onClick={recordAndAdvance} disabled={!answered}
              className="k-btn-primary w-full py-2.5 text-sm disabled:opacity-40">
              {idx + 1 < total ? 'Next' : 'Finish check'}
            </button>
            <p className="text-xs text-muted text-center">
              You won&apos;t see the answers until you finish. That&apos;s what makes this count.
            </p>
          </div>
        )}

        {phase === 'grading' && <p className="text-sm text-muted py-10 text-center">Checking…</p>}

        {phase === 'done' && result && (
          <div className="py-4 space-y-5">
            <div className="text-center">
              <div className="font-opmono text-d3 font-semibold tabular-nums text-ink">
                {Math.round((result.score || 0) * 100)}%
              </div>
              {/* Process-level, never person-level. */}
              <p className="text-sm text-muted mt-2">
                {result.estimate?.confirmed >= 0.95
                  ? 'Confirmed. You did that without help.'
                  : result.score >= 0.6
                    ? 'Solid progress. This comes back once more to confirm it.'
                    : 'Not there yet. We’ll work it again before checking.'}
              </p>
            </div>

            {result.estimate && (
              <div className="rounded-md bg-panel2 border border-border px-4 py-3.5 space-y-2">
                <Row label="Working" value={result.estimate.working} tone="muted"
                  hint="what you can do with help" />
                <Row label="Confirmed" value={result.estimate.confirmed} tone="ink"
                  hint="what you can do on your own" />
              </div>
            )}

            {result.calibrationGap != null && (
              <p className="text-xs text-muted text-center">
                {result.calibrationGap <= 0.25
                  ? 'Your prediction matched the outcome. That is a skill worth having.'
                  : 'Your predictions were off this time. Noticing that gap is how it closes.'}
              </p>
            )}

            <button onClick={onClose} className="k-btn-primary w-full py-2.5 text-sm">Done</button>
          </div>
        )}
      </div>
    </div>
  );
}

function Row({ label, value, tone, hint }) {
  return (
    <div className="flex items-baseline gap-2 text-xs">
      <span className={`w-20 shrink-0 font-semibold ${tone === 'ink' ? 'text-ink' : 'text-muted'}`}>{label}</span>
      <span className="font-opmono tabular-nums font-semibold text-ink w-10">{Math.round((value || 0) * 100)}%</span>
      <span className="text-muted">{hint}</span>
    </div>
  );
}
