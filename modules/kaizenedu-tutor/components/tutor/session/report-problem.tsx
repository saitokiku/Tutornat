'use client';

import { useEffect, useId, useRef, useState, type FormEvent } from 'react';

import type { FlagRequest } from '@/lib/tutor/wire';

import { InlineNotice } from '@/components/tutor/shell/states';
import { NtButton } from '@/components/tutor/ui/button';

import { reportProblem } from './api';

const KINDS: ReadonlyArray<{ id: FlagRequest['kind']; label: string }> = [
  { id: 'unsafe', label: 'The tutor said something it should not have' },
  { id: 'wrong', label: 'The tutor got the maths wrong' },
  { id: 'other', label: 'Something else' },
];

/**
 * The report button (spec R10). A native `<dialog>`: focus moves into it, Esc
 * closes it, and the page behind it is inert, with no library involved.
 *
 * The form is a separate component keyed by whether the dialog is open, so
 * each opening starts empty without an effect having to reset it.
 * The note is optional and never appears in a log line — the route stores it
 * and logs the flag id only.
 */
export function ReportProblem({
  sessionId,
  open,
  onClose,
}: {
  sessionId: string;
  open: boolean;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement | null>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className="nt-panel w-[min(32rem,92vw)] p-5 backdrop:bg-black/40"
      onClose={onClose}
      aria-labelledby={titleId}
    >
      <h2 className="nt-h2" id={titleId}>
        Report a problem
      </h2>
      <ReportForm key={open ? 'open' : 'closed'} sessionId={sessionId} onClose={onClose} />
    </dialog>
  );
}

function ReportForm({ sessionId, onClose }: { sessionId: string; onClose: () => void }) {
  const [kind, setKind] = useState<FlagRequest['kind']>('wrong');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const groupId = useId();

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setFailure(null);
    const result = await reportProblem({
      sessionId,
      kind,
      ...(note.trim() ? { note: note.trim() } : {}),
    });
    setBusy(false);
    if (!result.ok) {
      setFailure(result.message);
      return;
    }
    setDone(true);
    setNote('');
  };

  return (
    <form className="mt-4 flex flex-col gap-4" onSubmit={submit}>
      <p className="nt-small">
        This goes to the people who run the service. It never changes what the tutor says next in
        this session.
      </p>

      <fieldset className="nt-check-options">
        <legend className="nt-label">What happened</legend>
        {KINDS.map((option) => (
          <label className="nt-check-option" key={option.id}>
            <input
              type="radio"
              name={`${groupId}-kind`}
              value={option.id}
              checked={kind === option.id}
              onChange={() => setKind(option.id)}
              disabled={busy || done}
            />
            <span>{option.label}</span>
          </label>
        ))}
      </fieldset>

      <label className="flex flex-col gap-1">
        <span className="nt-label">Anything to add (optional)</span>
        <textarea
          className="nt-dock-input"
          rows={3}
          maxLength={500}
          value={note}
          onChange={(event) => setNote(event.target.value)}
          disabled={busy || done}
        />
      </label>

      {failure ? (
        <InlineNotice tone="stop" role="alert">
          {failure}
        </InlineNotice>
      ) : null}
      {done ? (
        <InlineNotice tone="success" role="status">
          Thanks. The report was filed.
        </InlineNotice>
      ) : null}

      <div className="flex gap-3">
        {done ? null : (
          <NtButton type="submit" busy={busy}>
            Send the report
          </NtButton>
        )}
        <NtButton type="button" tone="secondary" onClick={onClose}>
          {done ? 'Back to the session' : 'Cancel'}
        </NtButton>
      </div>
    </form>
  );
}
