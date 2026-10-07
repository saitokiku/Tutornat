'use client';

import { useState, useMemo } from 'react';
import { TYPE_LABEL } from '@/lib/courses';
import { IconPlus } from '@/components/Icons';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import {
  courseGrade, gpa, neededInCategory, projectGrade,
  targetPercentForLetter, letterFor, DEFAULT_SCALE,
} from '@/lib/grades';

const TARGET_LETTERS = ['A', 'B', 'C', 'D'];

// The one mark for "there is no figure here yet". Written out rather than
// drawn as a dash, because a dash beside real numbers reads as a value.
const NONE = 'n/a';

function letterTone(letter) {
  if (!letter) return 'text-muted';
  const l = letter[0];
  if (l === 'A' || l === 'B') return 'text-good';
  if (l === 'C') return 'text-warn';
  return 'text-bad';
}

function fmtPct(p) {
  return p == null ? NONE : `${p % 1 === 0 ? p : p.toFixed(1)}%`;
}

// ── GPA + trend ───────────────────────────────────────────────────────────────
function GpaCard({ value, history }) {
  const pts = (history || []).map((h) => h.gpa).filter((g) => g != null);
  return (
    <Card className="flex items-center gap-5">
      <div>
        <div className="k-label">Current GPA</div>
        <div className="font-opmono text-d3 font-semibold text-ink leading-none tabular-nums mt-1.5">
          {value == null ? NONE : value.toFixed(2)}
        </div>
        <div className="text-xs text-muted mt-1.5">unweighted 4.0 · credit-weighted</div>
      </div>
      {pts.length > 1 && <Sparkline values={pts} />}
    </Card>
  );
}

function Sparkline({ values }) {
  const [hover, setHover] = useState(null);
  const w = 120, h = 40, pad = 3;
  const min = Math.min(...values, 0), max = Math.max(...values, 4);
  const span = max - min || 1;
  const step = (w - pad * 2) / (values.length - 1);
  const xy = (v, i) => [pad + i * step, h - pad - ((v - min) / span) * (h - pad * 2)];
  const d = values.map((v, i) => `${i === 0 ? 'M' : 'L'} ${xy(v, i).join(' ')}`).join(' ');
  return (
    <div className="ml-auto shrink-0 relative">
      <svg width={w} height={h}
        onMouseLeave={() => setHover(null)}
        onMouseMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const i = Math.max(0, Math.min(values.length - 1, Math.round(((e.clientX - rect.left) - pad) / step)));
          setHover(i);
        }}>
        {/* The scale the line is read against: 0 at the floor, 4.0 at the top. */}
        <line x1={pad} y1={h - pad} x2={w - pad} y2={h - pad} stroke="rgb(var(--c-border))" strokeWidth="1" />
        <path d={d} fill="none" stroke="rgb(var(--c-accent))" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {hover != null && (() => { const [x, y] = xy(values[hover], hover); return <circle cx={x} cy={y} r="3" fill="rgb(var(--c-accent))" />; })()}
      </svg>
      {hover != null && (
        <div className="absolute -top-5 right-0 font-opmono text-xs font-semibold text-ink tabular-nums bg-panel border border-border rounded-sm px-1.5 shadow-soft">
          {values[hover].toFixed(2)}
        </div>
      )}
    </div>
  );
}

// ── Category weight bars ──────────────────────────────────────────────────────
// The track is the scale, not decoration: the bar reads as a share of 100%.
function CategoryBars({ rows }) {
  return (
    <div className="space-y-1.5">
      {rows.map((r) => (
        <div key={r.id} className="flex items-center gap-2.5 text-xs">
          <span className="w-28 shrink-0 text-muted truncate">{r.name}</span>
          <div className="flex-1 h-2 rounded-full bg-panel2 overflow-hidden">
            <div className="h-full rounded-full" style={{
              width: `${Math.max(0, Math.min(100, r.pct == null ? 0 : r.pct))}%`,
              background: r.pct == null ? 'transparent' : 'rgb(var(--c-accent))',
            }} />
          </div>
          <span className="w-10 shrink-0 text-right text-muted font-opmono tabular-nums">{r.weight}%</span>
          <span className="w-14 shrink-0 text-right font-medium text-ink font-opmono tabular-nums">
            {r.pct == null ? <span className="text-muted">{NONE}</span> : fmtPct(Math.round(r.pct * 10) / 10)}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Gradebook table (inline score entry) ──────────────────────────────────────
function GradebookRow({ a, categories, onUpdate }) {
  const [open, setOpen] = useState(false);
  const [earned, setEarned] = useState(a.pointsEarned ?? '');
  const [possible, setPossible] = useState(a.pointsPossible ?? '');
  const [category, setCategory] = useState(a.category ?? (categories[0]?.name || ''));

  function save() {
    const pe = earned === '' ? null : Number(earned);
    const pp = possible === '' ? null : Number(possible);
    const graded = pe != null && pp > 0 && !Number.isNaN(pe);
    onUpdate(a.id, {
      pointsEarned: pe, pointsPossible: pp, category: category || null,
      graded, gradedAt: graded ? new Date().toISOString() : null,
    });
    setOpen(false);
  }

  const pct = a.graded && a.pointsPossible > 0 ? (a.pointsEarned / a.pointsPossible) * 100 : null;

  return (
    <div className="border-t border-border">
      <button onClick={() => setOpen((o) => !o)} className="w-full flex items-center gap-3 py-2 text-left hover:bg-panel2 transition-colors">
        <span className="flex-1 min-w-0">
          <span className="text-xs text-ink truncate block">{a.title}</span>
          <span className="text-xs text-muted">{a.category || TYPE_LABEL[a.type] || a.type}</span>
        </span>
        {a.graded ? (
          <span className="text-xs font-opmono tabular-nums text-muted shrink-0">{a.pointsEarned}/{a.pointsPossible}</span>
        ) : null}
        <span className={`text-xs font-semibold w-14 text-right shrink-0 font-opmono tabular-nums ${pct == null ? 'text-muted' : letterTone(letterFor(pct))}`}>
          {pct == null ? 'ungraded' : fmtPct(Math.round(pct))}
        </span>
      </button>
      {open && (
        <div className="pb-3 grid grid-cols-[1fr_auto_1fr_auto] items-end gap-2">
          <label className="text-xs text-muted">
            Category
            <select value={category} onChange={(e) => setCategory(e.target.value)}
              className="k-input mt-1 px-2 py-1.5 text-xs">
              {categories.length === 0 && <option value="">Overall</option>}
              {categories.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
            </select>
          </label>
          <div className="flex items-end gap-1.5">
            <label className="text-xs text-muted">Score
              <input type="number" value={earned} onChange={(e) => setEarned(e.target.value)} placeholder="score"
                className="k-input mt-1 w-16 px-2 py-1.5 text-xs font-opmono tabular-nums" />
            </label>
            <span className="pb-1.5 text-muted">/</span>
            <label className="text-xs text-muted">Out of
              <input type="number" value={possible} onChange={(e) => setPossible(e.target.value)} placeholder="total"
                className="k-input mt-1 w-16 px-2 py-1.5 text-xs font-opmono tabular-nums" />
            </label>
          </div>
          <span />
          <Button size="sm" className="justify-self-end" onClick={save}>Save</Button>
        </div>
      )}
    </div>
  );
}

// ── What-if simulator ─────────────────────────────────────────────────────────
function WhatIf({ course, assignments, rows }) {
  const [target, setTarget] = useState(course.targetGrade || 'A');
  const [overrides, setOverrides] = useState({});
  const scale = course.gradeScale || DEFAULT_SCALE;
  const targetPct = targetPercentForLetter(target, scale) ?? 90;

  const ungraded = rows.filter((r) => r.pct == null && r.weight > 0);
  const projected = projectGrade(course, assignments, overrides);

  return (
    <Card variant="inset" pad="sm" className="mt-3 space-y-3">
      <div className="flex items-center gap-2 text-xs">
        <span className="text-muted">I want a</span>
        <select value={target} onChange={(e) => setTarget(e.target.value)}
          className="k-input w-auto px-2 py-1 text-xs font-semibold">
          {TARGET_LETTERS.map((l) => <option key={l} value={l}>{l}</option>)}
        </select>
        <span className="text-muted">in this class.</span>
      </div>

      {ungraded.length === 0 ? (
        <p className="text-xs text-muted">Everything is graded. Your current grade is your final grade.</p>
      ) : (
        <div className="space-y-1.5">
          {ungraded.map((r) => {
            const need = neededInCategory(course, assignments, targetPct, r.id);
            return (
              <div key={r.id} className="flex items-center gap-2 text-xs">
                <span className="flex-1 text-ink">
                  {need == null ? NONE
                    : need <= 0 ? <>You&apos;ve already locked in the <b>{target}</b>. <span className="text-good">No pressure on {r.name}.</span></>
                    : need > 100 ? <>A <b>{target}</b> isn&apos;t reachable from <b>{r.name}</b> alone.</>
                    : <>Need <b className={`font-opmono tabular-nums ${letterTone(letterFor(need))}`}>{fmtPct(Math.round(need * 10) / 10)}</b> on <b>{r.name}</b>.</>}
                </span>
                <input type="number" placeholder="try" value={overrides[r.id] ?? ''}
                  onChange={(e) => setOverrides((o) => ({ ...o, [r.id]: e.target.value === '' ? null : Number(e.target.value) }))}
                  className="k-input w-16 px-2 py-1 text-xs font-opmono tabular-nums" />
              </div>
            );
          })}
          <div className="pt-1 text-xs text-muted">
            Projected: <b className={`font-opmono ${letterTone(projected.letter)}`}>{projected.letter || NONE}</b>{' '}
            <span className="font-opmono tabular-nums">{fmtPct(projected.percent)}</span>
            <span> · assumes untried categories match your target</span>
          </div>
        </div>
      )}
    </Card>
  );
}

// ── Course card ───────────────────────────────────────────────────────────────
function CourseCard({ course, assignments, onUpdateAssignment }) {
  const grade = useMemo(() => courseGrade(course, assignments), [course, assignments]);
  const rows = grade.byCategory;
  const hasCats = (course.gradeCategories || []).length > 0;

  return (
    <Card className="space-y-4">
      <div className="flex items-start gap-3">
        <span className="w-1.5 self-stretch rounded-full shrink-0" style={{ background: course.color }} />
        <div className="flex-1 min-w-0">
          <div className="font-brand text-t3 font-semibold text-ink truncate">{course.name}</div>
          <div className="text-xs text-muted">
            {course.code ? `${course.code} · ` : ''}{Number(course.credits) || 1} credit{(Number(course.credits) || 1) === 1 ? '' : 's'}
            {hasCats ? '' : ' · points-based'}
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className={`font-opmono text-t1 font-semibold leading-none ${letterTone(grade.letter)}`}>{grade.letter || NONE}</div>
          <div className="text-xs text-muted font-opmono tabular-nums mt-1">{fmtPct(grade.percent)}</div>
        </div>
      </div>

      {hasCats && <CategoryBars rows={rows} />}

      {hasCats && <WhatIf course={course} assignments={assignments} rows={rows} />}

      <div>
        <div className="k-label mb-1">Gradebook</div>
        {assignments.length === 0 ? (
          <p className="text-xs text-muted py-2">No items yet. Add work from Today or Plan, or drop a graded test into the magic box.</p>
        ) : (
          <div>
            {assignments
              .slice()
              .sort((a, b) => new Date(a.due) - new Date(b.due))
              .map((a) => (
                <GradebookRow key={a.id} a={a} categories={course.gradeCategories || []} onUpdate={onUpdateAssignment} />
              ))}
          </div>
        )}
      </div>
    </Card>
  );
}

// ── View ──────────────────────────────────────────────────────────────────────
export default function GradesView({ app, onUpdateAssignment, onUploadGraded }) {
  const courses = app.courses || [];
  const assignments = app.assignments || [];
  const assignmentsFor = (cid) => assignments.filter((a) => a.courseId === cid);
  const overallGpa = useMemo(() => gpa(courses, assignmentsFor), [courses, assignments]);

  return (
    <div className="pb-24 lg:pb-10 space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="font-brand text-t1 font-semibold text-ink">Grades</h1>
          <p className="text-xs text-muted mt-1">Your real standing. Enter scores, see your grade, and simulate what you need.</p>
        </div>
        {onUploadGraded && (
          <Button size="sm" className="shrink-0" onClick={onUploadGraded}
            title="Drop in a returned test or quiz. Kaizen reads the score and files it">
            <IconPlus size={15} strokeWidth={2.2} /> Upload graded work
          </Button>
        )}
      </div>

      {courses.length === 0 ? (
        <Card pad="lg" className="text-center">
          <p className="text-sm text-muted">No courses yet. Paste a syllabus in the magic box and Kaizen pulls out your classes <em>and</em> their grade weights.</p>
        </Card>
      ) : (
        <>
          <GpaCard value={overallGpa} history={app.gradeHistory} />
          <div className="grid gap-4 lg:grid-cols-2">
            {courses.map((c) => (
              <CourseCard key={c.id} course={c} assignments={assignmentsFor(c.id)} onUpdateAssignment={onUpdateAssignment} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
