'use client';

import { useState, useMemo } from 'react';
import { courseById, TYPE_LABEL } from '@/lib/courses';
import { IconCheck, IconX, IconPlus, IconChevronLeft, IconChevronRight } from '@/components/Icons';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import TaskModal from '@/components/TaskModal';

// Plan is a month grid over a day list. Dense on purpose: the whole point is
// seeing a month at once, so the cells stay square and the record values
// (dates, minutes) sit in mono where they line up column to column.
//
// Course colors are user data; this is the fallback for a task with no class,
// and it is a token reference rather than a hex so it can never drift.
const NO_COURSE = 'rgb(var(--c-muted))';
// The selected cell is ink, so its dots invert to paper.
const ON_INK = 'rgb(var(--c-paper))';

function sameDay(a, b) {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
}

export default function CalendarView({ app, onCompleteAssignment, onDeleteAssignment, onAddTask, onStudyAssignment, onRescheduleAssignment }) {
  const today = useMemo(() => { const d = new Date(); d.setHours(0,0,0,0); return d; }, []);
  const [cursor, setCursor] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [selected, setSelected] = useState(today);
  const [modalOpen, setModalOpen] = useState(false);
  const [dragId, setDragId] = useState(null);      // assignment being dragged
  const [dragOverKey, setDragOverKey] = useState(null); // day cell under the cursor

  function dropOnDay(d) {
    const id = dragId;
    setDragId(null); setDragOverKey(null);
    if (id && onRescheduleAssignment) {
      const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      onRescheduleAssignment(id, iso);
      setSelected(new Date(d));
    }
  }

  const grid = useMemo(() => {
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const start = new Date(first);
    start.setDate(start.getDate() - start.getDay());
    const cells = [];
    for (let i = 0; i < 42; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      cells.push(d);
    }
    // trim trailing full week outside month
    return cells.slice(0, cells[35].getMonth() === cursor.getMonth() ? 42 : 35);
  }, [cursor]);

  const byDay = useMemo(() => {
    const map = new Map();
    for (const a of app.assignments) {
      const key = new Date(a.due).toDateString();
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(a);
    }
    return map;
  }, [app.assignments]);

  const dayItems = (byDay.get(selected.toDateString()) || [])
    .sort((a, b) => (a.status === b.status ? 0 : a.status === 'todo' ? -1 : 1));

  function move(delta) {
    setCursor((c) => new Date(c.getFullYear(), c.getMonth() + delta, 1));
  }

  return (
    <div className="space-y-5 pb-28">
      <div className="pt-1 flex items-end justify-between gap-3">
        <div>
          <h1 className="font-brand text-t1 font-semibold text-ink">Plan</h1>
          <p className="text-xs text-muted mt-1">Everything due, in one calm place.</p>
        </div>
        <Button size="sm" onClick={() => setModalOpen(true)}>
          <IconPlus size={15} strokeWidth={2.2} /> Task
        </Button>
      </div>

      {/* Month header */}
      <Card pad="sm">
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={() => move(-1)}
            aria-label="Previous month"
            className="w-8 h-8 rounded-full bg-panel2 text-muted flex items-center justify-center transition-colors hover:text-ink"
          >
            <IconChevronLeft size={16} />
          </button>
          <div className="text-t3 font-semibold text-ink tabular-nums">
            {cursor.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </div>
          <button
            onClick={() => move(1)}
            aria-label="Next month"
            className="w-8 h-8 rounded-full bg-panel2 text-muted flex items-center justify-center transition-colors hover:text-ink"
          >
            <IconChevronRight size={16} />
          </button>
        </div>

        {/* Weekday header */}
        <div className="grid grid-cols-7 mb-1">
          {['S','M','T','W','T','F','S'].map((d, i) => (
            <div key={i} className="text-center k-label py-1">{d}</div>
          ))}
        </div>

        {/* Day grid */}
        <div className="grid grid-cols-7 gap-1">
          {grid.map((d, i) => {
            const inMonth = d.getMonth() === cursor.getMonth();
            const isToday = sameDay(d, today);
            const isSel = sameDay(d, selected);
            const items = byDay.get(d.toDateString()) || [];
            const todos = items.filter((a) => a.status === 'todo');
            return (
              <button
                key={i}
                onClick={() => setSelected(new Date(d))}
                onDragOver={(e) => { if (dragId) { e.preventDefault(); setDragOverKey(d.toDateString()); } }}
                onDragLeave={() => setDragOverKey((k) => (k === d.toDateString() ? null : k))}
                onDrop={(e) => { e.preventDefault(); dropOnDay(new Date(d)); }}
                className={[
                  'aspect-square rounded-sm flex flex-col items-center justify-center gap-1 transition-colors relative',
                  dragOverKey === d.toDateString() ? 'ring-2 ring-accent bg-accent/15' : '',
                  isSel ? 'bg-ink text-paper' : isToday ? 'bg-accent/10' : 'hover:bg-panel2',
                  !inMonth ? 'opacity-30' : '',
                ].join(' ')}
              >
                <span className={`font-opmono text-xs tabular-nums ${isSel ? 'font-semibold text-paper' : isToday ? 'font-semibold text-accent' : 'text-ink'}`}>
                  {d.getDate()}
                </span>
                <span className="flex gap-0.5 h-1.5">
                  {todos.slice(0, 3).map((a, j) => {
                    const c = courseById(app.courses, a.courseId);
                    return <span key={j} className="w-1.5 h-1.5 rounded-full" style={{ background: isSel ? ON_INK : (c?.color || NO_COURSE) }} />;
                  })}
                  {items.length > 0 && todos.length === 0 && (
                    <span className={`w-1.5 h-1.5 rounded-full ${isSel ? 'bg-paper/50' : 'bg-good/50'}`} />
                  )}
                </span>
              </button>
            );
          })}
        </div>
      </Card>

      {/* Selected day */}
      <section className="space-y-2.5">
        <div className="flex items-center justify-between px-1">
          <h2 className="k-label">
            {sameDay(selected, today) ? 'Today' : selected.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </h2>
          <button
            onClick={() => setModalOpen(true)}
            className="inline-flex items-center gap-1 text-xs font-semibold text-accent transition-colors hover:text-ink"
          >
            <IconPlus size={13} strokeWidth={2.2} /> Add here
          </button>
        </div>
        {dayItems.some((a) => a.status === 'todo') && onRescheduleAssignment && (
          <p className="hidden sm:block text-xs text-muted px-1 -mt-1">Tip: drag a task onto a day above to reschedule it.</p>
        )}

        {dayItems.length === 0 && (
          <Card pad="none" className="px-5 py-8 text-center">
            <div className="text-xs text-muted">Nothing due this day.</div>
          </Card>
        )}

        {dayItems.map((a) => {
          const course = courseById(app.courses, a.courseId);
          const done = a.status === 'done';
          return (
            <Card
              key={a.id}
              pad="none"
              draggable={!done && Boolean(onRescheduleAssignment)}
              onDragStart={() => setDragId(a.id)}
              onDragEnd={() => { setDragId(null); setDragOverKey(null); }}
              className={`px-4 py-3.5 flex items-center gap-3 ${done ? 'opacity-55' : ''} ${!done && onRescheduleAssignment ? 'cursor-grab active:cursor-grabbing' : ''} ${dragId === a.id ? 'opacity-50 ring-2 ring-accent' : ''}`}
            >
              <button
                onClick={() => !done && onCompleteAssignment(a.id)}
                disabled={done}
                aria-label={done ? 'Completed' : 'Mark complete'}
                className={`w-6 h-6 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
                  done ? 'bg-good border-good text-paper' : 'border-border hover:border-good hover:bg-good/10'
                }`}
              >
                {done ? <IconCheck size={12} strokeWidth={2.2} /> : null}
              </button>
              <div className="flex-1 min-w-0">
                <div className={`text-sm font-semibold truncate ${done ? 'text-muted line-through' : 'text-ink'}`}>{a.title}</div>
                <div className="flex items-center gap-2 mt-0.5 text-xs text-muted">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: course?.color || NO_COURSE }} />
                  <span className="truncate">{course?.name || 'Personal'}</span>
                  <span className="w-1 h-1 rounded-full bg-border shrink-0" />
                  <span>{TYPE_LABEL[a.type] || a.type}</span>
                  <span className="w-1 h-1 rounded-full bg-border shrink-0" />
                  <span className="font-opmono tabular-nums">{a.minutes} min</span>
                </div>
              </div>
              {!done && (
                <Button variant="secondary" size="sm" className="shrink-0" onClick={() => onStudyAssignment(a)}>
                  Tutor
                </Button>
              )}
              <button
                onClick={() => onDeleteAssignment(a.id)}
                title="Delete task"
                className="shrink-0 w-7 h-7 rounded-full text-muted hover:text-bad hover:bg-bad/10 flex items-center justify-center transition-colors"
              >
                <IconX size={13} />
              </button>
            </Card>
          );
        })}
      </section>

      {modalOpen && (
        <TaskModal
          courses={app.courses}
          defaultDate={selected}
          onSave={onAddTask}
          onClose={() => setModalOpen(false)}
        />
      )}
    </div>
  );
}
