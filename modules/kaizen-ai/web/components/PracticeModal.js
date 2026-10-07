'use client';

// AI practice set for one concept. Generates 5 difficulty-aware questions,
// runs an interactive answer flow (auto-checked MC + self-marked short answer),
// then records the attempt and feeds the score back into spaced repetition via
// onGraded(quality). Surfaces the previously-dormant practice_sets table.

import { useState, useEffect } from 'react';
import { authedFetch } from '@/lib/supabaseClient';
import { IconCheck, IconX, IconSpark } from '@/components/Icons';

export default function PracticeModal({ conceptId, conceptName, courseId, mastery = 0, onClose, onGraded }) {
  const [phase, setPhase] = useState('loading'); // loading | quiz | done | error
  const [error, setError] = useState('');
  const [setId, setSetId] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState(null);   // MC choice index
  const [revealed, setRevealed] = useState(false);
  const [shortText, setShortText] = useState('');
  const [correct, setCorrect] = useState([]);    // boolean per question

  useEffect(() => {
    let alive = true;
    authedFetch('/api/practice', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ concept: conceptName, courseId, mastery }),
    }).then(async (r) => {
      const d = await r.json().catch(() => ({}));
      if (!alive) return;
      if (!r.ok) { setError(d.error || 'Could not build a practice set.'); setPhase('error'); return; }
      setQuestions(d.questions || []); setSetId(d.id || null); setPhase('quiz');
    }).catch(() => { if (alive) { setError('Could not build a practice set.'); setPhase('error'); } });
    return () => { alive = false; };
  }, [conceptName, courseId, mastery]);

  const q = questions[idx];
  const total = questions.length;

  function mark(isRight) {
    setCorrect((prev) => { const c = prev.slice(); c[idx] = isRight; return c; });
    setRevealed(true);
  }

  function next() {
    if (idx + 1 < total) {
      setIdx(idx + 1); setPicked(null); setRevealed(false); setShortText('');
    } else {
      finish();
    }
  }

  async function finish() {
    const score = correct.filter(Boolean).length;
    const quality = total ? Math.max(0, Math.min(5, Math.round((score / total) * 5))) : 0;
    setPhase('done');
    onGraded?.(conceptId, quality);
    if (setId) {
      authedFetch('/api/practice', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: setId, results: { score, total }, quality }),
      }).catch(() => {});
    }
  }

  const score = correct.filter(Boolean).length;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-ink/30 backdrop-blur-sm p-0 sm:p-5" onClick={onClose}>
      <div className="w-full max-w-md bg-panel rounded-t-lg sm:rounded-lg border border-border shadow-lift p-5 sm:p-6 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="min-w-0">
            <h2 className="text-t2 font-semibold text-ink">Practice · {conceptName}</h2>
            {phase === 'quiz' && (
              <p className="text-xs text-muted mt-1">
                Question <span className="font-opmono tabular-nums">{idx + 1}</span> of{' '}
                <span className="font-opmono tabular-nums">{total}</span>
              </p>
            )}
          </div>
          <button onClick={onClose} aria-label="Close" className="w-8 h-8 rounded-full bg-panel2 text-muted hover:text-ink transition-colors flex items-center justify-center shrink-0">
            <IconX size={15} />
          </button>
        </div>

        {phase === 'loading' && <p className="text-sm text-muted py-10 text-center">Building your practice set…</p>}
        {phase === 'error' && (
          <div className="py-8 text-center">
            <p className="text-sm text-bad">{error}</p>
            <button onClick={onClose} className="mt-4 k-btn-secondary px-6 py-2.5 text-sm">Close</button>
          </div>
        )}

        {phase === 'quiz' && q && (
          <div className="space-y-3">
            <p className="text-body font-medium text-ink">{q.q}</p>

            {q.type === 'mc' ? (
              <div className="space-y-2">
                {q.choices.map((choice, i) => {
                  const isAns = i === q.answer;
                  const chosen = picked === i;
                  const cls = !revealed
                    ? (chosen ? 'border-accent bg-accent/5' : 'border-border hover:border-ink/30')
                    : isAns ? 'border-good bg-good/10' : chosen ? 'border-bad bg-bad/10' : 'border-border opacity-60';
                  return (
                    <button key={i} disabled={revealed}
                      onClick={() => { setPicked(i); mark(i === q.answer); }}
                      className={`w-full text-left rounded-sm border px-3.5 py-2.5 text-sm text-ink transition-colors ${cls}`}>
                      {choice}
                      {revealed && isAns && <span className="inline-block align-middle ml-1.5 text-good"><IconCheck size={14} /></span>}
                      {revealed && chosen && !isAns && <span className="inline-block align-middle ml-1.5 text-bad"><IconX size={14} /></span>}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="space-y-2">
                <textarea value={shortText} onChange={(e) => setShortText(e.target.value)} rows={2} disabled={revealed}
                  placeholder="Your answer…" className="k-input bg-panel2 py-2.5 text-sm resize-none disabled:opacity-70" />
                {!revealed && <button onClick={() => setRevealed(true)} className="k-btn-secondary px-5 py-2.5 text-sm">Reveal answer</button>}
                {revealed && (
                  <div className="rounded-sm border border-border bg-panel2 px-3.5 py-3">
                    <div className="k-label">Expected answer</div>
                    <div className="text-sm text-ink mt-1">{q.answer}</div>
                    <div className="flex gap-2 mt-3">
                      <button onClick={() => mark(true)} className="flex-1 py-2 rounded-full border border-good/30 bg-good/10 text-xs font-semibold text-ink">I got it</button>
                      <button onClick={() => mark(false)} className="flex-1 py-2 rounded-full border border-warn/30 bg-warn/10 text-xs font-semibold text-ink">I missed it</button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {revealed && q.explain && correct[idx] !== undefined && (
              <p className="flex gap-2 text-xs text-muted bg-panel2 border border-border rounded-sm px-3 py-2.5">
                <IconSpark size={14} className="text-accent shrink-0 mt-0.5" />
                <span>{q.explain}</span>
              </p>
            )}
            {revealed && correct[idx] !== undefined && (
              <button onClick={next} className="k-btn-primary w-full py-2.5 text-sm">
                {idx + 1 < total ? 'Next question' : 'Finish'}
              </button>
            )}
          </div>
        )}

        {phase === 'done' && (
          <div className="py-6 text-center space-y-3">
            <div className="font-opmono text-d3 font-semibold tabular-nums text-ink">{score}/{total}</div>
            <p className="text-sm text-muted">
              {score === total ? 'Every one landed. That concept is solid.' : score >= total * 0.6 ? 'Nice work. Your review schedule just updated.' : 'Good effort. We’ll bring this back sooner.'}
            </p>
            <button onClick={onClose} className="k-btn-primary px-6 py-2.5 text-sm">Done</button>
          </div>
        )}
      </div>
    </div>
  );
}
