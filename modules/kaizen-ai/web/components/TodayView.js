'use client';

import { useMemo, useState } from 'react';
import Rings, { RING_TONES } from '@/components/Rings';
import TaskModal from '@/components/TaskModal';
import { SakuraBranch } from '@/components/Brand';
import { IconPlus, IconCheck, IconClock, IconSpark } from '@/components/Icons';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Eyebrow from '@/components/ui/Eyebrow';
import { courseById } from '@/lib/courses';
import { isToday, isOverdue, daysUntil, dueLabel } from '@/lib/appState';
import { masteryPercent } from '@/lib/mastery';

// Today is a plan, not a dashboard: the one next step leads, the week sits
// under the greeting as context, and the figures come last as a quiet record.
//
// Task-level acknowledgement only. No person-praise ("you're so smart"), no
// normative comparison, and nothing that makes the STREAK the thing being
// congratulated — a third of feedback interventions measurably reduce
// performance, and self-level feedback is the reliably harmful category.
const CHEERS = [
  'One less thing. Nicely done.',
  'That ring is closing.',
  'Done beats perfect.',
  'Small improvement still counts.',
  'That one is behind you.',
];

const WONDER_TOPICS = [
  'Why the sky is dark at night if the universe is infinite',
  'How your phone knows exactly where you are',
  'Why octopuses might be the closest thing to aliens',
  'The math hidden inside music',
  'How memories physically form in your brain',
  'Why time moves slower near black holes',
  'How languages are born and die',
  'The chemistry of why food tastes good',
];

// Course colors are user data; this is the fallback for a task with no class,
// and it is a token reference rather than a hex so it can never drift.
const NO_COURSE = 'rgb(var(--c-muted))';

function getGreeting(name) {
  const h = new Date().getHours();
  const g = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  return name ? `${g}, ${name}` : g;
}

// ── Week strip ────────────────────────────────────────────────────────────────
function WeekStrip({ assignments, courses }) {
  const days = useMemo(() => {
    const out = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() + i);
      const next = new Date(d);
      next.setDate(next.getDate() + 1);
      const due = assignments.filter((a) => {
        const t = new Date(a.due);
        return t >= d && t < next && a.status === 'todo';
      });
      out.push({ date: d, due });
    }
    return out;
  }, [assignments]);

  return (
    <div className="grid grid-cols-7 gap-1.5">
      {days.map((d, i) => {
        const isNow = i === 0;
        return (
          <div
            key={i}
            className={`rounded-sm px-1 py-2.5 text-center transition-colors ${
              isNow ? 'bg-ink text-paper' : 'bg-panel border border-border'
            }`}
          >
            <div className={`font-opmono text-micro ${isNow ? 'text-paper/70' : 'text-muted'}`}>
              {d.date.toLocaleDateString('en-US', { weekday: 'short' })}
            </div>
            <div className={`font-opmono text-t3 font-semibold tabular-nums mt-0.5 ${isNow ? 'text-paper' : 'text-ink'}`}>
              {d.date.getDate()}
            </div>
            <div className="flex justify-center gap-0.5 mt-2 h-1.5">
              {d.due.slice(0, 3).map((a, j) => {
                const c = courseById(courses, a.courseId);
                return <span key={j} className="w-1.5 h-1.5 rounded-full" style={{ background: c?.color || NO_COURSE }} />;
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Assignment row ────────────────────────────────────────────────────────────
function AssignmentRow({ a, course, onComplete, onDelete, onStudy }) {
  const [leaving, setLeaving] = useState(false);
  const [menu, setMenu] = useState(false);
  const overdue = isOverdue(a.due);
  const today = isToday(a.due);

  function complete() {
    setLeaving(true);
    setTimeout(() => onComplete(a.id), 450);
  }

  return (
    <Card
      variant="inset"
      pad="none"
      className={`px-4 py-3.5 flex items-center gap-3.5 transition-all duration-500 ${leaving ? 'opacity-0 scale-95 -translate-y-1' : 'opacity-100'}`}
    >
      <button
        onClick={complete}
        aria-label="Mark complete"
        className="w-7 h-7 rounded-full border border-border bg-panel hover:border-good hover:bg-good/10 flex items-center justify-center transition-colors shrink-0 group"
      >
        <IconCheck size={13} strokeWidth={2.2} className="text-good opacity-0 group-hover:opacity-100 transition-opacity" />
      </button>

      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold text-ink truncate">{a.title}</div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="inline-flex items-center gap-1.5 text-xs text-muted">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: course?.color || NO_COURSE }} />
            {course?.name || 'Personal'}
          </span>
          <span className="w-1 h-1 rounded-full bg-border shrink-0" />
          <span className={`font-opmono text-xs tabular-nums ${overdue ? 'text-bad' : today ? 'text-warn' : 'text-muted'}`}>
            {dueLabel(a.due)}
          </span>
          <span className="w-1 h-1 rounded-full bg-border shrink-0" />
          <span className="font-opmono text-xs tabular-nums text-muted">{a.minutes} min</span>
        </div>
      </div>

      {menu ? (
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => onDelete(a.id)}
            className="rounded-full bg-bad/10 px-3 py-1.5 text-xs font-semibold text-bad transition-colors hover:bg-bad/15"
          >
            Delete
          </button>
          <button onClick={() => setMenu(false)} className="px-2 py-1.5 text-xs text-muted hover:text-ink transition-colors">
            Cancel
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-1.5 shrink-0">
          <Button variant="secondary" size="sm" onClick={() => onStudy(a)}>
            Tutor
          </Button>
          <button
            onClick={() => setMenu(true)}
            aria-label="More options"
            className="w-7 h-7 rounded-full text-muted hover:text-ink hover:bg-panel flex items-center justify-center leading-none transition-colors"
          >
            &#8943;
          </button>
        </div>
      )}
    </Card>
  );
}

// ── Celebration ───────────────────────────────────────────────────────────────
function Celebration({ show, text }) {
  if (!show) return null;
  return (
    <div className="fixed inset-0 pointer-events-none z-50 flex flex-col items-center justify-center gap-3">
      <div className="animate-[pop_0.9s_ease-out_forwards] w-16 h-16 rounded-full bg-panel border border-border shadow-lift flex items-center justify-center">
        <IconCheck size={30} strokeWidth={2.2} className="text-good" />
      </div>
      <div className="animate-[pop_0.9s_ease-out_forwards] bg-ink text-paper text-xs font-semibold px-4 py-2 rounded-full shadow-lift">{text}</div>
      <style>{`
        @keyframes pop {
          0% { transform: scale(0.3); opacity: 0; }
          35% { transform: scale(1.12); opacity: 1; }
          80% { transform: scale(1); opacity: 1; }
          100% { transform: scale(1); opacity: 0; }
        }
      `}</style>
    </div>
  );
}

// ── Today ─────────────────────────────────────────────────────────────────────
export default function TodayView({ app, concepts, onCompleteAssignment, onDeleteAssignment, onAddTask, onStudyAssignment, onCurious, onOpenIntake }) {
  const [celebrate, setCelebrate] = useState(false);
  const [cheer, setCheer] = useState(CHEERS[0]);
  const [modalOpen, setModalOpen] = useState(false);
  const [wonder, setWonder] = useState('');

  const todo = app.assignments
    .filter((a) => a.status === 'todo')
    .sort((x, y) => new Date(x.due) - new Date(y.due));
  const doneToday = app.assignments.filter(
    (a) => a.status === 'done' && a.completedAt && isToday(a.completedAt)
  );
  const dueTodayTodo = todo.filter((a) => isToday(a.due) || isOverdue(a.due));
  const dueTodayTotal = dueTodayTodo.length + doneToday.length;

  const sessionsToday = concepts.reduce(
    (n, c) => n + c.history.filter((h) => isToday(h.at)).length, 0
  );
  const avgMastery = concepts.length
    ? concepts.reduce((s, c) => s + masteryPercent(c), 0) / concepts.length
    : 0;

  const rings = [
    { pct: dueTodayTotal ? doneToday.length / dueTodayTotal : 1, ...RING_TONES.accent },
    { pct: Math.min(sessionsToday / 3, 1), ...RING_TONES.good },
    { pct: avgMastery / 100, ...RING_TONES.ink },
  ];

  const upcoming = todo.filter((a) => !isToday(a.due) && !isOverdue(a.due) && daysUntil(a.due) <= 7);

  // The single next best action — due-today first, then the nearest upcoming.
  const nextUp = dueTodayTodo[0] || upcoming[0] || null;
  const nextUpCourse = nextUp ? courseById(app.courses, nextUp.courseId) : null;
  const dueNowRest = dueTodayTodo.filter((a) => a !== nextUp);
  const upcomingRest = upcoming.filter((a) => a !== nextUp);

  function handleComplete(id) {
    setCheer(CHEERS[Math.floor(Math.random() * CHEERS.length)]);
    setCelebrate(true);
    setTimeout(() => setCelebrate(false), 1000);
    onCompleteAssignment(id);
  }

  function surpriseMe() {
    const t = WONDER_TOPICS[Math.floor(Math.random() * WONDER_TOPICS.length)];
    onCurious(t);
  }

  return (
    <div className="space-y-6 pb-28 lg:pb-10 animate-fadeUp">
      <Celebration show={celebrate} text={cheer} />

      {/* Greeting + streak + add */}
      <div className="flex flex-wrap items-start justify-between gap-3 pt-1">
        <div>
          <h1 className="font-brand text-t1 font-semibold text-ink">{getGreeting(app.profile.name)}</h1>
          <p className="text-xs text-muted mt-1">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* The streak is a neutral history, not a thing to lose. No flame, no
              loss framing, no repair purchase, no guilt copy — loss-aversion
              mechanics aimed at children buy retention with a debt the product
              can't repay, and there is no evidence they improve learning. The
              primary progress metric is confirmed concepts, shown on Growth. */}
          {app.streak.count > 2 && (
            <div className="flex items-center gap-2 bg-panel border border-border rounded-full px-3 py-1.5"
              title="Days you've studied. Pauses are free.">
              <span className="font-opmono text-micro uppercase text-muted">studied</span>
              <span className="font-opmono text-sm font-semibold tabular-nums text-ink">
                {app.streak.count}d
              </span>
            </div>
          )}
          {onOpenIntake && (
            <Button
              variant="primary"
              size="sm"
              onClick={onOpenIntake}
              title="Add anything: a class, a quiz, a syllabus"
            >
              <IconPlus size={15} strokeWidth={2.2} /> Add anything
            </Button>
          )}
          <button
            onClick={() => setModalOpen(true)}
            aria-label="Add a single task"
            className="w-9 h-9 rounded-full bg-panel border border-border text-ink shadow-soft flex items-center justify-center hover:border-ink/30 active:scale-95 transition-[border-color,transform]"
            title="Add a single task manually"
          >
            <IconPlus size={16} />
          </button>
        </div>
      </div>

      {/* The week, as context for the plan below */}
      <WeekStrip assignments={app.assignments} courses={app.courses} />

      {/* Next step — the one thing to do now */}
      {nextUp && (
        <Card as="section" pad="none" className="relative overflow-hidden shadow-lift">
          <div className="absolute inset-0 bg-gradient-to-br from-panel2 via-transparent to-transparent pointer-events-none" />
          <SakuraBranch width={220} className="absolute -top-9 -right-10 opacity-25 pointer-events-none hidden sm:block" />
          <div className="relative p-5 sm:p-6">
            <Eyebrow className="mb-2.5">Your next step</Eyebrow>
            <h2 className="font-brand text-t2 font-semibold text-ink">{nextUp.title}</h2>
            <div className="flex flex-wrap items-center gap-2 mt-2 text-xs text-muted">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: nextUpCourse?.color || NO_COURSE }} />
                {nextUpCourse?.name || 'Personal'}
              </span>
              <span className="w-1 h-1 rounded-full bg-border shrink-0" />
              <span className={`font-opmono tabular-nums ${isOverdue(nextUp.due) ? 'text-bad' : isToday(nextUp.due) ? 'text-warn' : ''}`}>{dueLabel(nextUp.due)}</span>
              <span className="w-1 h-1 rounded-full bg-border shrink-0" />
              <span className="inline-flex items-center gap-1.5"><IconClock size={13} /> about <span className="font-opmono tabular-nums">{nextUp.minutes}</span> min</span>
            </div>
            <div className="flex flex-wrap items-center gap-2 mt-5">
              <Button variant="primary" onClick={() => onStudyAssignment(nextUp)}>
                Start with the tutor
              </Button>
              <Button variant="secondary" onClick={() => handleComplete(nextUp.id)}>
                <IconCheck size={14} strokeWidth={2.2} className="text-good" /> Done
              </Button>
              {dueNowRest.length > 0 && (
                <span className="text-xs text-muted ml-auto hidden sm:block">
                  then <span className="font-opmono tabular-nums">{dueNowRest.length}</span> more due today
                </span>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Also due today */}
      {dueNowRest.length > 0 && (
        <section className="space-y-2">
          <h2 className="k-label px-1">Also due today</h2>
          {dueNowRest.map((a) => (
            <AssignmentRow
              key={a.id} a={a}
              course={courseById(app.courses, a.courseId)}
              onComplete={handleComplete}
              onDelete={onDeleteAssignment}
              onStudy={onStudyAssignment}
            />
          ))}
        </section>
      )}

      {/* This week */}
      {upcomingRest.length > 0 && (
        <section className="space-y-2">
          <h2 className="k-label px-1">This week</h2>
          {upcomingRest.map((a) => (
            <AssignmentRow
              key={a.id} a={a}
              course={courseById(app.courses, a.courseId)}
              onComplete={handleComplete}
              onDelete={onDeleteAssignment}
              onStudy={onStudyAssignment}
            />
          ))}
        </section>
      )}

      {/* All clear */}
      {todo.length === 0 && (
        <Card pad="none" className="relative overflow-hidden px-6 py-12 text-center">
          <SakuraBranch width={260} className="absolute -top-10 -right-14 opacity-20 pointer-events-none" />
          <div className="relative">
            <div className="font-brand text-t2 font-semibold text-ink">All clear. You&apos;re ahead of your week.</div>
            <div className="text-sm text-muted mt-1.5">A good moment for one small session, or a curiosity dive below.</div>
          </div>
        </Card>
      )}

      {/* Where today stands — the record, kept quiet and kept last */}
      <Card variant="inset" pad="none" className="p-5 flex flex-col sm:flex-row items-center gap-6">
        <Rings rings={rings}>
          <div className="text-center">
            <div className="font-opmono text-t1 font-semibold tabular-nums text-ink leading-none">
              {doneToday.length}<span className="text-muted text-t3">/{dueTodayTotal || 0}</span>
            </div>
            <div className="font-opmono text-micro uppercase text-muted mt-1.5">done today</div>
          </div>
        </Rings>
        <div className="flex-1 w-full space-y-3">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-accent shrink-0" />
            <span className="text-sm text-ink flex-1">Homework</span>
            <span className="font-opmono text-sm tabular-nums text-muted">{doneToday.length}/{dueTodayTotal || 0}</span>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-good shrink-0" />
            <span className="text-sm text-ink flex-1">Study sessions</span>
            <span className="font-opmono text-sm tabular-nums text-muted">{sessionsToday}/3</span>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-ink shrink-0" />
            <span className="text-sm text-ink flex-1">Mastery</span>
            <span className="font-opmono text-sm tabular-nums text-muted">{Math.round(avgMastery)}%</span>
          </div>
        </div>
      </Card>

      {/* Curiosity dive */}
      <Card as="section" className="space-y-4">
        <div className="flex items-center gap-3">
          <span className="w-9 h-9 shrink-0 rounded-sm bg-accent/10 text-accent flex items-center justify-center">
            <IconSpark size={18} />
          </span>
          <div>
            <h2 className="font-brand text-t3 font-semibold text-ink">Feeling curious?</h2>
            <p className="text-xs text-muted">Learn something just because you want to. No grades, no syllabus.</p>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            value={wonder}
            onChange={(e) => setWonder(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && wonder.trim() && onCurious(wonder.trim())}
            placeholder="What have you always wondered about?"
            className="k-input text-sm flex-1"
          />
          <Button
            variant="primary"
            onClick={() => wonder.trim() && onCurious(wonder.trim())}
            disabled={!wonder.trim()}
            className="shrink-0"
          >
            Dive in
          </Button>
        </div>
        <Button variant="secondary" size="sm" block onClick={surpriseMe}>
          Surprise me with something wild
        </Button>
      </Card>

      {modalOpen && (
        <TaskModal
          courses={app.courses}
          defaultDate={new Date()}
          onSave={onAddTask}
          onClose={() => setModalOpen(false)}
        />
      )}
    </div>
  );
}
