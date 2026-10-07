'use client';

import { useState, useRef } from 'react';
import IntakeBox from '@/components/IntakeBox';
import { KaizenMark } from '@/components/Brand';
import { logEvent } from '@/lib/devlog';
import Button from '@/components/ui/Button';
import Field from '@/components/ui/Field';
import Notice from '@/components/ui/Notice';
import { IconArrowRight, IconChevronLeft, IconPlus, IconSpark } from '@/components/Icons';

// Onboarding: name → intake → review → build.
// One smart box: paste a syllabus, list classes, or dump what's due — the AI
// organizes everything into courses, topics, and assignments.

export default function SetupFlow({ onComplete }) {
  const [step, setStep] = useState('name'); // name | intake | review
  const [name, setName] = useState('');
  const [goal, setGoal] = useState('grades');
  const [learningStyle, setLearningStyle] = useState('mix');
  // accumulated intake patch (multiple "add more" rounds merge here)
  const [patch, setPatch] = useState({ summary: '', courses: [], assignments: [], notes: [] });
  const roundRef = useRef(0);

  function begin() {
    if (!name.trim()) return;
    setStep('intake');
  }

  // ── Intake: accumulate patches (re-key tempIds per round) ────────────────
  // Called once for pasted text and once per file in a batch. Same-name courses
  // across rounds merge later in applyIntake, so parallel files can't duplicate
  // a class. The review transition waits for onDone (below) so a running batch
  // never unmounts the intake box mid-flight.
  function handleIntakeResult(result) {
    if (!result) return;
    const round = ++roundRef.current;
    const rekey = (tid) => (tid ? `r${round}:${tid}` : tid);
    const courses = (result.courses || []).map((c) => ({ ...c, tempId: rekey(c.tempId) }));
    const assignments = (result.assignments || []).map((a) => ({
      ...a,
      courseRef: typeof a.courseRef === 'string' && a.courseRef.startsWith('temp:')
        ? `temp:${rekey(a.courseRef.slice(5))}`
        : a.courseRef || null,
    }));
    setPatch((prev) => ({
      summary: [prev.summary, result.summary].filter(Boolean).join(' '),
      courses: [...prev.courses, ...courses],
      assignments: [...prev.assignments, ...assignments],
      notes: [...prev.notes, ...(result.notes || [])],
    }));
  }

  function deleteCourse(tempId) {
    setPatch((prev) => ({
      ...prev,
      courses: prev.courses.filter((c) => c.tempId !== tempId),
      assignments: prev.assignments.map((a) =>
        a.courseRef === `temp:${tempId}` ? { ...a, courseRef: null } : a
      ),
    }));
  }

  function deleteAssignment(i) {
    setPatch((prev) => ({ ...prev, assignments: prev.assignments.filter((_, j) => j !== i) }));
  }

  function setAssignmentDate(i, dueDate) {
    setPatch((prev) => ({
      ...prev,
      assignments: prev.assignments.map((a, j) => (j === i ? { ...a, dueDate: dueDate || null } : a)),
    }));
  }

  function courseNameFor(ref) {
    if (typeof ref === 'string' && ref.startsWith('temp:')) {
      return patch.courses.find((c) => c.tempId === ref.slice(5))?.name || 'Personal';
    }
    return 'Personal';
  }

  function buildDashboard() {
    logEvent('store', 'Setup complete', `${patch.courses.length} courses · ${patch.assignments.length} assignments via intake`);
    onComplete({ name: name.trim() || 'Student', goal, learningStyle, patch });
  }

  // Escape hatches so onboarding never dead-ends when the AI intake is
  // unavailable (audit: setup hard-blocked on a single AI call).
  const [manualClass, setManualClass] = useState('');
  function addManualClass() {
    const n = manualClass.trim();
    if (!n) return;
    handleIntakeResult({ summary: '', courses: [{ tempId: `m${roundRef.current}`, name: n, topics: [] }], assignments: [], notes: [] });
    setManualClass('');
    setStep('review');
  }
  function skipSetup() {
    logEvent('store', 'Setup skipped', 'empty start — user will add classes later');
    onComplete({ name: name.trim() || 'Student', goal, learningStyle, patch: { summary: '', courses: [], assignments: [], notes: [] } });
  }

  const hasAnything = patch.courses.length > 0 || patch.assignments.length > 0;

  return (
    <div className="min-h-screen bg-paper flex items-center justify-center px-5 py-12">
      <div className="w-full max-w-narrow">

        {/* Name */}
        {step === 'name' && (
          <div className="space-y-8 animate-fadeUp">
            <div className="text-center">
              <div className="flex justify-center mb-5"><KaizenMark size={64} /></div>
              <h1 className="font-brand text-d3 font-semibold text-ink">Welcome to Kaizen</h1>
              <p className="text-muted mt-2 text-body">
                Your school, handled. One calm place for homework,<br />studying, and actually remembering it all.
              </p>
            </div>
            <Field
              label="What should we call you?"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && name.trim()) begin(); }}
              placeholder="Your first name"
              autoFocus
            />
            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-ink">Main goal</span>
                <select value={goal} onChange={(e) => setGoal(e.target.value)}
                  className="k-input px-3 py-2.5 text-sm appearance-none">
                  <option value="grades">Raise my grades</option>
                  <option value="exam">Ace an upcoming exam</option>
                  <option value="understand">Actually understand the material</option>
                  <option value="ahead">Get ahead of my class</option>
                </select>
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-ink">How you learn best</span>
                <select value={learningStyle} onChange={(e) => setLearningStyle(e.target.value)}
                  className="k-input px-3 py-2.5 text-sm appearance-none">
                  <option value="mix">Mix of everything</option>
                  <option value="direct">Direct explanations</option>
                  <option value="socratic">Socratic hints</option>
                  <option value="examples">Worked examples</option>
                  <option value="quiz">Quiz me</option>
                </select>
              </label>
            </div>
            <Button
              onClick={begin}
              disabled={!name.trim()}
              variant="primary"
              size="lg"
              block
            >
              Begin
            </Button>
          </div>
        )}

        {/* Intake */}
        {step === 'intake' && (
          <div className="space-y-5">
            <IntakeBox existingCourses={[]} variant="onboarding" onResult={handleIntakeResult} onDone={() => setStep('review')} />
            {hasAnything && (
              <button onClick={() => setStep('review')} className="w-full inline-flex items-center justify-center gap-1.5 text-xs text-muted hover:text-ink transition-colors">
                <IconChevronLeft size={14} />
                <span>
                  Back to what I&apos;ve added (
                  <span className="font-opmono tabular-nums">{patch.courses.length}</span>
                  {' '}{patch.courses.length === 1 ? 'class' : 'classes'})
                </span>
              </button>
            )}

            {/* Fallback: add a class by hand, or skip — so the AI is never a wall */}
            <div className="pt-4 border-t border-border space-y-3">
              <p className="text-xs text-muted text-center">Rather do it by hand?</p>
              <div className="flex gap-2">
                <input
                  value={manualClass}
                  onChange={(e) => setManualClass(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') addManualClass(); }}
                  placeholder="Add a class, e.g. Algebra II"
                  className="k-input flex-1 py-2.5 text-sm"
                />
                <Button onClick={addManualClass} disabled={!manualClass.trim()} variant="secondary" size="sm">Add</Button>
              </div>
              <button onClick={skipSetup} className="w-full inline-flex items-center justify-center gap-1.5 text-xs text-muted hover:text-ink transition-colors">
                Skip for now, I&apos;ll add my classes later
                <IconArrowRight size={14} />
              </button>
            </div>
          </div>
        )}

        {/* Review */}
        {step === 'review' && (
          <div className="space-y-5 animate-fadeUp">
            <div className="text-center">
              <h2 className="font-brand text-t1 font-semibold text-ink">Here&apos;s what I heard</h2>
              <p className="text-muted mt-1.5 text-sm">Fix anything that&apos;s off, then build your dashboard.</p>
            </div>

            {patch.notes.length > 0 && (
              <Notice kind="warn" className="space-y-1.5">
                {patch.notes.slice(0, 4).map((n, i) => (
                  <p key={i} className="flex items-start gap-2">
                    <span className="text-warn shrink-0 mt-0.5"><IconSpark size={14} /></span>
                    <span>{n}</span>
                  </p>
                ))}
              </Notice>
            )}

            {patch.courses.length > 0 && (
              <div className="space-y-2">
                <h3 className="k-label px-1">Classes</h3>
                {patch.courses.map((c) => (
                  <div key={c.tempId} className="k-card p-3.5 flex items-center gap-3">
                    <span className="w-9 h-9 rounded-sm bg-accent/10 text-accent flex items-center justify-center text-xs font-semibold uppercase shrink-0">
                      {String(c.name).slice(0, 2)}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-ink truncate">{c.name}</div>
                      <div className="text-xs text-muted">
                        <span className="font-opmono tabular-nums">{(c.topics || []).length}</span> topics{c.teacher ? ` · ${c.teacher}` : ''}
                      </div>
                    </div>
                    <button onClick={() => deleteCourse(c.tempId)} className="text-xs font-semibold text-bad rounded-full px-3 py-1.5 shrink-0 hover:bg-bad/10 transition-colors">
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}

            {patch.assignments.length > 0 && (
              <div className="space-y-2">
                <h3 className="k-label px-1">Assignments</h3>
                {patch.assignments.map((a, i) => (
                  <div key={i} className="k-card p-3.5 space-y-2">
                    <div className="flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-ink truncate">{a.title}</div>
                        <div className="text-xs text-muted">{courseNameFor(a.courseRef)} · {a.type || 'homework'}</div>
                      </div>
                      <button onClick={() => deleteAssignment(i)} className="text-xs font-semibold text-bad rounded-full px-3 py-1.5 shrink-0 hover:bg-bad/10 transition-colors">
                        Remove
                      </button>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <label className="text-xs text-muted shrink-0">Due</label>
                      <input
                        type="date"
                        value={a.dueDate || ''}
                        onChange={(e) => setAssignmentDate(i, e.target.value)}
                        className="bg-panel2 border border-border rounded-sm px-2.5 py-1.5 text-xs font-opmono tabular-nums text-ink focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-colors"
                      />
                      {!a.dueDate && <span className="text-xs text-muted">no date, I&apos;ll space it out this week</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!hasAnything && (
              <p className="text-center text-xs text-muted py-4">Nothing here yet. Add something below.</p>
            )}

            <div className="space-y-2.5">
              <Button
                onClick={buildDashboard}
                disabled={!hasAnything}
                variant="primary"
                size="lg"
                block
              >
                Looks good, build my dashboard
              </Button>
              <Button onClick={() => setStep('intake')} variant="secondary" block>
                <IconPlus size={16} />
                Add more classes or work
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
