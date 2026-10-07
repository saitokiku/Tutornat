'use client';

import { useEffect, useId, useRef, useState, type FormEvent } from 'react';

import type { CheckPrompt, CheckResult } from '@/lib/tutor/contracts';

import { InlineNotice } from '@/components/tutor/shell/states';
import { NtButton } from '@/components/tutor/ui/button';

import { answerCheck } from './api';

/**
 * One check item and its result (spec §5.2 CHECK). The card takes focus when
 * it appears, because it is the thing to do next; the answer goes to
 * `POST /api/tutor/check`, which grades it and answers the `CheckResult` the
 * avatar reacts to.
 *
 * `latencyMs` is measured from the card appearing to the answer being sent —
 * the strategy's "assisted versus unassisted" bookkeeping cares how long a
 * learner sat with an item.
 */
export function CheckCard({
  sessionId,
  check,
  onResult,
}: {
  sessionId: string;
  check: CheckPrompt;
  onResult: (result: CheckResult) => void;
}) {
  const [choice, setChoice] = useState<string[]>([]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  // Set when the card appears, not during render: the clock is not pure.
  const shownAt = useRef(0);
  const headingRef = useRef<HTMLParagraphElement | null>(null);
  const groupId = useId();

  // The caller keys this component by `checkId`, so a new item arrives as a
  // fresh mount with empty fields; this effect only starts the clock and moves
  // focus to the question, which is the thing to do next.
  useEffect(() => {
    shownAt.current = Date.now();
    headingRef.current?.focus();
  }, []);

  const options = check.options ?? [];
  const multiple = check.type === 'multiple';
  const typed = check.type === 'numeric' || check.type === 'short' || check.type === 'symbolic';
  const ready = typed ? text.trim().length > 0 : choice.length > 0;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!ready || busy) return;
    setBusy(true);
    setFailure(null);
    const answer: string | string[] | number = typed
      ? check.type === 'numeric' && text.trim() !== '' && Number.isFinite(Number(text))
        ? Number(text)
        : text.trim()
      : multiple
        ? choice
        : (choice[0] ?? '');
    const result = await answerCheck({
      sessionId,
      checkId: check.checkId,
      answer,
      latencyMs: shownAt.current === 0 ? 0 : Date.now() - shownAt.current,
    });
    setBusy(false);
    if (!result.ok) {
      setFailure(result.message);
      return;
    }
    onResult(result.data.result);
  };

  return (
    <form className="nt-check" onSubmit={submit} aria-labelledby={`${groupId}-stem`}>
      <p className="nt-check-stem" id={`${groupId}-stem`} ref={headingRef} tabIndex={-1}>
        {check.stem}
      </p>

      {typed ? (
        <>
          <label className="sr-only" htmlFor={`${groupId}-answer`}>
            Your answer
          </label>
          <input
            id={`${groupId}-answer`}
            className="nt-dock-input"
            value={text}
            onChange={(event) => setText(event.target.value)}
            inputMode={check.type === 'numeric' ? 'decimal' : 'text'}
            autoComplete="off"
            disabled={busy}
          />
        </>
      ) : (
        <fieldset className="nt-check-options">
          <legend className="sr-only">
            {multiple ? 'Choose every answer that fits' : 'Choose one answer'}
          </legend>
          {options.map((option) => (
            <label className="nt-check-option" key={option.id}>
              <input
                type={multiple ? 'checkbox' : 'radio'}
                name={`${groupId}-choice`}
                value={option.id}
                checked={choice.includes(option.id)}
                disabled={busy}
                onChange={(event) => {
                  const { checked } = event.target;
                  setChoice((current) => {
                    if (!multiple) return checked ? [option.id] : [];
                    return checked
                      ? [...current, option.id]
                      : current.filter((id) => id !== option.id);
                  });
                }}
              />
              <span>{option.text}</span>
            </label>
          ))}
        </fieldset>
      )}

      {failure ? (
        <InlineNotice tone="stop" role="alert">
          {failure}
        </InlineNotice>
      ) : null}

      <div>
        <NtButton type="submit" disabled={!ready} busy={busy}>
          Answer
        </NtButton>
      </div>
    </form>
  );
}

/** The last result, until the next check replaces it. Correct is a fact, not a party. */
export function CheckResultCard({ result }: { result: CheckResult }) {
  return (
    <InlineNotice
      tone={result.correct ? 'success' : 'warning'}
      title={result.correct ? 'That’s right.' : 'Not quite.'}
      role="status"
    >
      {result.rationale}
    </InlineNotice>
  );
}
