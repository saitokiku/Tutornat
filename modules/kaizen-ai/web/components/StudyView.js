'use client';

import { useRef, useState } from 'react';
import { masteryPercent, statusOf, isDue } from '@/lib/mastery';
import { ingestFile, prettySize, isTextFile } from '@/lib/files';
import { logEvent } from '@/lib/devlog';
import { IconX, IconPlus, IconSpark, IconSprout } from '@/components/Icons';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';

// Ring colors are palette references, never hex, so a mastery ring can never
// drift from the status tokens the rest of the product reads by.
const RING_COLOR = { good: 'rgb(var(--c-good))', warn: 'rgb(var(--c-warn))', bad: 'rgb(var(--c-bad))' };
const RING_TRACK = 'rgb(var(--c-border))';

function MiniRing({ pct, size = 40 }) {
  const status = statusOf(pct);
  const r = size / 2 - 3;
  const circ = 2 * Math.PI * r;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={RING_TRACK} strokeWidth="3.5" />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke={RING_COLOR[status]} strokeWidth="3.5" strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={circ * (1 - pct / 100)}
          style={{ transition: 'stroke-dashoffset 0.6s ease' }}
        />
      </svg>
      {/* The figure is written out, so the ring itself carries no information a
          screen reader loses. */}
      <div className="absolute inset-0 flex items-center justify-center font-opmono text-xs font-semibold tabular-nums text-ink">
        {pct}
      </div>
    </div>
  );
}

// A file's kind, read off its own name. Display only: the row's second line
// still says whether the tutor can actually read it.
function fileKind(name) {
  const dot = String(name || '').lastIndexOf('.');
  if (dot < 0) return 'FILE';
  return String(name).slice(dot + 1, dot + 5).toUpperCase() || 'FILE';
}

// ── File library ──────────────────────────────────────────────────────────────
function Library({ app, files, onAddFiles, onRemoveFile, onTagFile }) {
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);

  async function handleFiles(e) {
    const list = Array.from(e.target.files || []);
    if (!list.length) return;
    setBusy(true);
    const records = [];
    for (const f of list) {
      const rec = await ingestFile(f);
      records.push(rec);
      logEvent('input', 'File added to library',
        `${f.name} · ${isTextFile(f) ? 'text extracted' : 'metadata only (parse server-side later)'}`);
    }
    onAddFiles(records);
    setBusy(false);
    e.target.value = '';
  }

  return (
    <section className="space-y-2.5">
      <div className="flex items-center justify-between gap-3 px-1">
        <div>
          <h2 className="font-brand text-t3 font-semibold text-ink">Library</h2>
          <p className="text-xs text-muted">Notes, worksheets, study guides. Tag them to a class and the tutor reads them automatically.</p>
        </div>
        <input ref={inputRef} type="file" multiple className="hidden" onChange={handleFiles}
          accept=".txt,.md,.markdown,.csv,.json,.pdf,.doc,.docx,.png,.jpg,.jpeg" />
        <Button
          variant="secondary"
          size="sm"
          className="shrink-0"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
        >
          {busy ? 'Reading…' : <><IconPlus size={14} strokeWidth={2.2} /> Upload</>}
        </Button>
      </div>

      {files.length > 0 && (
        <Card pad="none" className="divide-y divide-border overflow-hidden">
          {files.map((f) => (
            <div key={f.id} className="flex items-center gap-3 px-4 py-3">
              <span className="shrink-0 w-9 h-9 rounded-sm bg-panel2 border border-border flex items-center justify-center font-opmono text-micro text-muted">
                {fileKind(f.name)}
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-ink truncate">{f.name}</div>
                <div className="text-xs text-muted">
                  <span className="font-opmono tabular-nums">{prettySize(f.size)}</span>
                  {f.text ? ' · readable by tutor' : ' · stored (text extraction needs backend)'}
                </div>
              </div>
              <select
                value={f.courseId || ''}
                onChange={(e) => onTagFile(f.id, e.target.value || null)}
                className="k-input shrink-0 w-auto max-w-[110px] px-2 py-1.5 text-xs appearance-none"
              >
                <option value="">No class</option>
                {app.courses.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <button
                onClick={() => onRemoveFile(f.id)}
                aria-label={`Remove ${f.name}`}
                className="shrink-0 w-7 h-7 rounded-full text-muted hover:text-bad hover:bg-bad/10 flex items-center justify-center transition-colors"
              >
                <IconX size={13} />
              </button>
            </div>
          ))}
        </Card>
      )}
    </section>
  );
}

// ── Study ─────────────────────────────────────────────────────────────────────
export default function StudyView({ app, concepts, files, onStudy, onPractice, onAddFiles, onRemoveFile, onTagFile }) {
  const byCourse = app.courses.map((course) => ({
    course,
    concepts: concepts.filter((c) => course.topics.includes(c.name)),
  })).filter((g) => g.concepts.length > 0);

  const orphans = concepts.filter(
    (c) => !app.courses.some((course) => course.topics.includes(c.name))
  );

  const dueCount = concepts.filter(isDue).length;

  return (
    <div className="space-y-6 pb-28 lg:pb-10">
      <div className="pt-1">
        <h1 className="font-brand text-t1 font-semibold text-ink">Learn</h1>
        <p className="text-xs text-muted mt-1">
          {dueCount > 0
            ? `${dueCount} topic${dueCount > 1 ? 's' : ''} ready for another pass. A quick review keeps ${dueCount > 1 ? 'them' : 'it'} fresh.`
            : 'Everything is fresh. New sessions push mastery deeper.'}
        </p>
      </div>

      <Library app={app} files={files} onAddFiles={onAddFiles} onRemoveFile={onRemoveFile} onTagFile={onTagFile} />

      <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
        {byCourse.map(({ course, concepts: cs }) => (
          <section key={course.id} className="space-y-2.5">
            <div className="flex items-center gap-2 px-1">
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: course.color }} />
              <h2 className="font-brand text-t3 font-semibold text-ink truncate">{course.name}</h2>
              {course.teacher && <span className="text-xs text-muted truncate">{course.teacher}</span>}
            </div>
            <Card pad="none" className="divide-y divide-border overflow-hidden">
              {cs.map((c) => {
                const pct = masteryPercent(c);
                const due = isDue(c);
                const isNew = c.lastQuality === null;
                return (
                  <div key={c.id} className="flex items-center hover:bg-panel2 transition-colors">
                    <button onClick={() => onStudy(c)} className="flex-1 min-w-0 flex items-center gap-3.5 px-4 py-3.5 text-left">
                      <MiniRing pct={pct} />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-ink truncate">{c.name}</div>
                        <div className="text-xs text-muted mt-0.5">
                          {isNew ? 'Not started' : due ? 'Due for review' : (
                            <>
                              Next review in <span className="font-opmono tabular-nums">{c.interval}d</span>
                              {' · '}
                              <span className="font-opmono tabular-nums">{c.repetitions}</span> reps
                            </>
                          )}
                        </div>
                      </div>
                      {(due || isNew) && (
                        <span className={`k-badge shrink-0 ${isNew ? 'k-badge-accent' : 'k-badge-warn'}`}>
                          {isNew ? 'Start' : 'Review'}
                        </span>
                      )}
                    </button>
                    {onPractice && !isNew && (
                      <button onClick={() => onPractice(c)} title="AI practice set"
                        className="k-chip shrink-0 mr-3">
                        <IconSpark size={13} /> Practice
                      </button>
                    )}
                  </div>
                );
              })}
            </Card>
          </section>
        ))}

        {orphans.length > 0 && (
          <section className="space-y-2.5">
            <div className="flex items-center gap-2 px-1">
              <IconSprout size={15} className="text-accent shrink-0" />
              <h2 className="font-brand text-t3 font-semibold text-ink">Your own topics</h2>
              <span className="text-xs text-muted">from curiosity dives &amp; personal tasks</span>
            </div>
            <Card pad="none" className="divide-y divide-border overflow-hidden">
              {orphans.map((c) => (
                <button
                  key={c.id}
                  onClick={() => onStudy(c)}
                  className="w-full flex items-center gap-3.5 px-4 py-3.5 hover:bg-panel2 transition-colors text-left"
                >
                  <MiniRing pct={masteryPercent(c)} />
                  <div className="flex-1 text-sm font-medium text-ink truncate">{c.name}</div>
                </button>
              ))}
            </Card>
          </section>
        )}
      </div>
    </div>
  );
}
