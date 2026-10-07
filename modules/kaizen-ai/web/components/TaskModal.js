'use client';

import { useState } from 'react';
import { IconX } from '@/components/Icons';
import Button from '@/components/ui/Button';

const TYPES = ['homework', 'quiz', 'test', 'essay', 'reading', 'lab', 'project'];

function uid() {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : String(Date.now()) + Math.random().toString(16).slice(2);
}

export default function TaskModal({ courses, defaultDate, onSave, onClose }) {
  const [title, setTitle] = useState('');
  const [courseId, setCourseId] = useState(courses[0]?.id || '');
  const [type, setType] = useState('homework');
  const [date, setDate] = useState(
    (defaultDate || new Date()).toISOString().slice(0, 10)
  );
  const [minutes, setMinutes] = useState(30);

  function save() {
    if (!title.trim()) return;
    // The picker gives a bare date; a task is due at the END of that local day,
    // not at midnight in whatever zone the string is parsed in.
    const due = new Date(date + 'T23:59:00');
    onSave({
      id: uid(),
      courseId: courseId || null,
      title: title.trim(),
      type,
      concept: title.trim(),
      minutes: Number(minutes) || 30,
      due: due.toISOString(),
      status: 'todo',
      completedAt: null,
      manual: true,
    });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 bg-ink/40 backdrop-blur-sm flex items-end sm:items-center justify-center" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-narrow bg-panel border border-border rounded-t-md sm:rounded-md p-5 sm:p-6 space-y-4 shadow-lift"
      >
        <div className="flex items-center justify-between">
          <h2 className="font-brand text-t3 font-semibold text-ink">New task</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="text-muted hover:text-ink w-8 h-8 rounded-full bg-panel2 flex items-center justify-center transition-colors"
          >
            <IconX size={16} />
          </button>
        </div>

        <input
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && save()}
          placeholder="What do you need to do?"
          className="k-input"
        />

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block k-label mb-1.5 px-1">Class</label>
            <select
              value={courseId}
              onChange={(e) => setCourseId(e.target.value)}
              className="k-input px-3 py-2.5 text-sm appearance-none"
            >
              {courses.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
              <option value="">Personal</option>
            </select>
          </div>
          <div>
            <label className="block k-label mb-1.5 px-1">Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="k-input px-3 py-2.5 text-sm appearance-none capitalize"
            >
              {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="block k-label mb-1.5 px-1">Due date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="k-input px-3 py-2.5 text-sm font-opmono tabular-nums"
            />
          </div>
          <div>
            <label className="block k-label mb-1.5 px-1">Est. minutes</label>
            <input
              type="number"
              min="5" max="480" step="5"
              value={minutes}
              onChange={(e) => setMinutes(e.target.value)}
              className="k-input px-3 py-2.5 text-sm font-opmono tabular-nums"
            />
          </div>
        </div>

        <Button variant="primary" block onClick={save} disabled={!title.trim()}>
          Add task
        </Button>
      </div>
    </div>
  );
}
