'use client';

// The universal intake box — one smart input that accepts a syllabus, a brain
// dump, a single task, or MANY files at once (PDF, image/photo, Word, or plain
// text). Pasted text is organized inline; attached files upload straight to
// Storage and stream through /api/intake/ingest one at a time (magic box at
// scale), so a whole semester of large files becomes one organized dashboard.
// Reused in onboarding (variant="onboarding") and the dashboard omnibox
// (variant="modal").
//
// Visual contract (spec: docs/superpowers/specs/2026-08-22-one-system-rebuild.md):
// this is the first real interaction most people have with the product, and it
// is a QUEUE, so it is styled as a manifest — one ruled row per file, the kind
// as a mono tag, the state as a mono label in its own tone. A failure reads as
// a failure at a glance (bad), a plan limit as a limit (warn), and neither is
// ever painted in the success channel.
//
// Behavioral contracts preserved verbatim: pasted TEXT SUBMITS FIRST so courses
// exist before files attach to them; the client-side batch caps including the
// cumulative byte cap; the per-file status machine; a failure HOLDS THE PANEL
// OPEN behind a Continue button so the user can see which files failed; and the
// modal refuses to close on a backdrop click while busy.

import { useState, useRef, useEffect, useCallback } from 'react';
import { limitedFetch } from '@/lib/limits';
import { logEvent } from '@/lib/devlog';
import { capture } from '@/lib/analytics';
import { classifyFile, newId, runIntakeBatch, BATCH_CAPS } from '@/lib/intakeBatch';
import { IconCheck, IconRefresh, IconX, IconPlus, IconChevronRight } from '@/components/Icons';
import Button from '@/components/ui/Button';
import Notice from '@/components/ui/Notice';

const CHIPS = [
  { label: 'Paste my syllabus', fill: 'Course: AP Biology / Dr. Smith\n\nUnit 1: Chemistry of Life (Aug 25 to Sep 12)\n- Water & carbon chemistry\n- Macromolecules\nQuiz Sep 13\n\n(replace this with your real syllabus text)' },
  { label: 'List my classes', fill: "I'm taking AP Bio, English 11, and Algebra 2." },
  { label: "What's due this week", fill: 'Bio test on the cell cycle Friday, English essay due Monday, math problem set every night this week.' },
];

const STAGES = ['Reading', 'Organizing', 'Building'];

// One row per state. `cls` is the tone the label carries; a failure and a plan
// limit never borrow the success color.
const STATUS_UI = {
  queued: { label: 'Queued', cls: 'text-muted' },
  uploading: { label: 'Uploading', cls: 'text-accent' },
  reading: { label: 'Reading', cls: 'text-accent' },
  done: { label: 'Organized', cls: 'text-good', icon: IconCheck },
  duplicate: { label: 'Already saved', cls: 'text-muted', icon: IconRefresh },
  failed: { label: 'Failed', cls: 'text-bad', icon: IconX },
  limited: { label: 'Plan limit', cls: 'text-warn', dot: '!' }, // no warning mark in Icons.js — the glyph stays
};

// The kind reads as a mono tag rather than an emoji: same width every row, so
// a stack of twenty files scans as a column instead of a sprinkle of pictures.
const KIND_TAG = { pdf: 'PDF', image: 'IMG', docx: 'DOC', text: 'TXT' };

// Sizes are figures the box asserts, so they render in mono like every other
// figure in the product. Purely presentational; the caps live in intakeBatch.
function sizeLabel(bytes) {
  const n = Number(bytes);
  if (!Number.isFinite(n) || n <= 0) return '';
  if (n < 1024 * 1024) return `${Math.max(1, Math.round(n / 1024))} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export default function IntakeBox({ existingCourses = [], getExistingCourses, onResult, onDone, variant = 'onboarding', onClose }) {
  const [text, setText] = useState('');
  const [items, setItems] = useState([]);       // [{id, file, name, size, kind, mediaType, status, error}]
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState(0);
  const [error, setError] = useState('');
  const [dragging, setDragging] = useState(false);
  const [finished, setFinished] = useState(false);   // batch done but held open (failures to show)
  const fileRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => () => clearInterval(timerRef.current), []);

  const resolveExisting = useCallback(() => {
    if (getExistingCourses) return getExistingCourses();
    return (existingCourses || []).map((c) => ({ id: c.id, name: c.name, topics: c.topics || [] }));
  }, [getExistingCourses, existingCourses]);

  function addFiles(fileList) {
    setError('');
    const incoming = Array.from(fileList || []);
    if (!incoming.length) return;
    setItems((prev) => {
      let batchBytes = prev.reduce((s, it) => s + (it.size || 0), 0);
      const next = [...prev];
      for (const file of incoming) {
        if (next.length >= BATCH_CAPS.files) { setError(`Up to ${BATCH_CAPS.files} files at a time.`); break; }
        if (file.size > BATCH_CAPS.fileBytes) { setError(`"${file.name}" is over 25MB. Split or compress it.`); continue; }
        if (batchBytes + file.size > BATCH_CAPS.totalBytes) { setError('That batch is over 150MB. Add fewer files.'); break; }
        batchBytes += file.size;
        const { kind, mediaType } = classifyFile(file);
        next.push({ id: newId(), file, name: file.name, size: file.size, kind, mediaType, status: 'queued', error: null });
      }
      return next;
    });
  }

  function onDrop(e) {
    e.preventDefault();
    setDragging(false);
    if (busy) return;
    addFiles(e.dataTransfer?.files);
  }

  function removeItem(id) {
    if (busy) return;
    setItems((prev) => prev.filter((it) => it.id !== id));
  }

  const updateItem = useCallback((id, status, err = null) => {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, status, error: err } : it)));
  }, []);

  async function submit() {
    const trimmed = text.trim();
    if ((trimmed.length < 3 && items.length === 0) || busy) return;
    setBusy(true);
    setError('');
    setFinished(false);

    let failures = 0;
    try {
      // 1) Pasted text first — establishes courses so files attach, not duplicate.
      if (trimmed.length >= 3) {
        setStage(0);
        timerRef.current = setInterval(() => setStage((s) => Math.min(s + 1, STAGES.length - 1)), 1600);
        logEvent('intake', 'Parsing with claude-sonnet-5', 'text → structured courses');
        const res = await limitedFetch('/api/intake', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: trimmed, files: [], existingCourses: resolveExisting() }),
        });
        const data = await res.json().catch(() => ({}));
        clearInterval(timerRef.current);
        if (!res.ok) throw new Error(data.error || `That didn't go through (${res.status}).`);
        capture('intake_used', { variant, mode: 'text', courses: (data.courses || []).length });
        onResult?.(data, null);
        setText('');
      }

      // 2) Files stream through the storage-first batch.
      if (items.length > 0) {
        const batchItems = items.map((it) => ({ id: it.id, file: it.file, name: it.name, size: it.size, kind: it.kind, mediaType: it.mediaType }));
        logEvent('intake', `Ingesting ${batchItems.length} file(s)`, 'storage-first, concurrency 2');
        await runIntakeBatch(batchItems, {
          getExistingCourses: resolveExisting,
          onProgress: (id, status, err) => {
            if (status === 'failed' || status === 'limited') failures += 1;
            updateItem(id, status, err);
          },
          onResult: (patch, document) => onResult?.(patch, document),
        });
        capture('intake_used', { variant, mode: 'batch', files: batchItems.length, failures });
      }

      // Clean run → hand off (close modal / advance onboarding). If some files
      // failed, hold the panel open so the user can see which.
      if (failures === 0) {
        onDone?.();
        if (variant === 'modal') onClose?.();
      } else {
        setFinished(true);
      }
    } catch (err) {
      clearInterval(timerRef.current);
      setError(err.message || 'Something went wrong. Try again.');
    } finally {
      setBusy(false);
      setStage(0);
    }
  }

  const canSubmit = !busy && (text.trim().length >= 3 || items.some((it) => ['queued'].includes(it.status)));

  const body = (
    <div className="space-y-5">
      {variant === 'onboarding' && (
        <div className="text-center">
          {/* Sits in SetupFlow beside its other step heads, so it takes the
              same t1 they do rather than inventing a size for this step. */}
          <h2 className="font-brand text-t1 font-semibold text-ink">Tell me about your classes.</h2>
          <p className="text-sm text-muted mt-3">
            Paste a syllabus, list what you&apos;re taking, or drop in a whole folder of files.
            <br />I&apos;ll sort it all out.
          </p>
        </div>
      )}
      {variant === 'modal' && (
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-brand text-t2 font-semibold text-ink">Add anything</h2>
            <p className="text-xs text-muted mt-1">A class, a quiz, or a stack of files. I&apos;ll file it all.</p>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              aria-label="Close"
              className="w-8 h-8 shrink-0 rounded-full border border-border bg-panel2 text-muted flex items-center justify-center transition-colors hover:text-ink hover:border-ink/25"
            >
              <IconX size={15} />
            </button>
          )}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {CHIPS.map((c) => (
          <button key={c.label} type="button" onClick={() => setText(c.fill)} className="k-chip">{c.label}</button>
        ))}
      </div>

      <div
        onDragOver={(e) => { e.preventDefault(); if (!busy) setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={`rounded-sm transition-all ${dragging ? 'ring-2 ring-accent/50 ring-offset-2 ring-offset-paper' : ''}`}
      >
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={"I'm taking AP Bio, English 11, and Algebra 2. Bio test Friday… Or drag your syllabus, notes, and past tests right in."}
          rows={variant === 'modal' ? 5 : 7}
          disabled={busy}
          className="k-input text-sm resize-none disabled:opacity-60"
        />
      </div>

      {/* The manifest. One ruled row per file: kind, name, size, state. */}
      {items.length > 0 && (
        <div className="max-h-52 overflow-y-auto rounded-sm border border-border divide-y divide-border">
          {items.map((it) => {
            const ui = STATUS_UI[it.status] || STATUS_UI.queued;
            return (
              <div key={it.id} className="flex items-center gap-3 bg-panel2 px-3 py-2.5">
                <span className="shrink-0 w-9 text-center font-opmono text-micro text-muted border border-border rounded-sm bg-panel py-1">
                  {KIND_TAG[it.kind] || 'FILE'}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm font-medium text-ink truncate">{it.name}</span>
                    <span className="font-opmono text-micro text-muted tabular-nums shrink-0">{sizeLabel(it.size)}</span>
                  </div>
                  <div className={`mt-0.5 flex items-center gap-1.5 min-w-0 font-opmono text-micro uppercase ${ui.cls}`}>
                    {(it.status === 'uploading' || it.status === 'reading') && <span className="inline-block w-2.5 h-2.5 shrink-0 rounded-full border-2 border-accent/30 border-t-accent animate-spin" />}
                    {ui.icon && <ui.icon size={11} className="shrink-0" />}
                    <span className="shrink-0">{ui.dot ? `${ui.dot} ` : ''}{ui.label}</span>
                    {it.error ? <span className="truncate normal-case tracking-normal">{it.error}</span> : ''}
                  </div>
                </div>
                {!busy && !['done', 'duplicate'].includes(it.status) && (
                  <button onClick={() => removeItem(it.id)} aria-label={`Remove ${it.name}`} className="shrink-0 text-muted transition-colors hover:text-bad">
                    <IconX size={14} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {error && <Notice kind="bad">{error}</Notice>}

      {finished ? (
        <div className="flex gap-2">
          <Button type="button" onClick={() => { onDone?.(); if (variant === 'modal') onClose?.(); }} className="flex-1">
            Continue
          </Button>
        </div>
      ) : (
        <div className="flex gap-2">
          <input ref={fileRef} type="file" multiple accept=".pdf,.png,.jpg,.jpeg,.webp,.gif,.doc,.docx,.txt,.md,.markdown,.csv,.json,.tex" className="hidden" onChange={(e) => { addFiles(e.target.files); e.target.value = ''; }} />
          <Button type="button" variant="secondary" onClick={() => fileRef.current?.click()} disabled={busy} className="shrink-0">
            <IconPlus size={15} />Attach
          </Button>
          <Button type="button" onClick={submit} disabled={!canSubmit} className="flex-1">
            {busy && <span className="w-4 h-4 rounded-full border-2 border-paper/40 border-t-paper animate-spin" />}
            {busy ? (items.length ? 'Organizing files…' : `${STAGES[stage]}…`) : 'Sort it out'}
          </Button>
        </div>
      )}

      {busy && text.trim().length >= 3 && items.length === 0 && (
        <div className="flex items-center justify-center gap-2 pt-1">
          {STAGES.map((s, i) => (
            <span key={s} className={`inline-flex items-center gap-1.5 font-opmono text-micro uppercase transition-colors ${i < stage ? 'text-good' : i === stage ? 'text-accent' : 'text-muted/40'}`}>
              {i < stage && <IconCheck size={11} />}{s}{i < STAGES.length - 1 ? <IconChevronRight size={11} className="text-muted/40" /> : null}
            </span>
          ))}
        </div>
      )}
    </div>
  );

  if (variant === 'modal') {
    return (
      <div className="fixed inset-0 z-40 flex items-end sm:items-center justify-center bg-ink/30 backdrop-blur-sm p-0 sm:p-5" onClick={busy ? undefined : onClose}>
        <div className="w-full max-w-lg bg-panel rounded-t-md sm:rounded-md border border-border shadow-lift p-5 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
          {body}
        </div>
      </div>
    );
  }

  return body;
}
