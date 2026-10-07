'use client';

import { useRef, useState, type FormEvent } from 'react';

import type { GuestLevelId } from '@/kaizen.config';
import { publicConfig } from '@/kaizen.config';
import { checkStartSelection, guestApi } from '@/lib/tutor/client';
import type { SubjectId } from '@/lib/tutor/contracts';
import { PRODUCT_ROUTES } from '@/lib/tutor/contracts';

import { NtButton } from '@/components/tutor/ui/button';
import { ChoiceCards, type Choice } from '@/components/tutor/ui/choice-cards';
import { FormError } from '@/components/tutor/ui/form-error';

import { ModeToggle, useRememberedMode } from './start-session';
import { TopicFields } from './topic-fields';
import { createRemembered } from './use-remembered';

/**
 * The full start form (D35), under the grown-ups' disclosure on the landing
 * page since D36: a grade level with hints, a subject, what to work on in the
 * visitor's own words, voice or text, one button. Submit creates the
 * anonymous account and the first session in one call and moves to it with a
 * full navigation, so the new cookie applies to the session page. Nothing
 * here asks who the visitor is.
 */

const LEVEL_IDS = new Set<string>(publicConfig.guestLevels.map((level) => level.id));

/** The last level chosen in this browser, so a returning visitor is not asked again. */
export const useRememberedLevel = createRemembered<GuestLevelId>(
  'nt.guest.level',
  (raw) => (raw && LEVEL_IDS.has(raw) ? (raw as GuestLevelId) : '4-5'),
  '4-5',
);

const LEVEL_CHOICES: ReadonlyArray<Choice<GuestLevelId>> = publicConfig.guestLevels.map(
  (level) => ({ value: level.id, label: level.label, description: level.hint }),
);

export function GuestStart() {
  const [level, setLevel] = useRememberedLevel();
  const [mode, setMode] = useRememberedMode();
  const [subject, setSubject] = useState<SubjectId>('math');
  const [text, setText] = useState('');
  const [topicError, setTopicError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const textRef = useRef<HTMLInputElement>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const checked = checkStartSelection({
      source: 'topic',
      topic: { subject, text },
      courseworkId: null,
      skillId: null,
      mode,
    });
    if (!checked.ok) {
      setTopicError(checked.error);
      textRef.current?.focus();
      return;
    }
    setTopicError(null);
    setError(null);
    setBusy(true);
    const result = await guestApi.startGuest({
      level,
      mode,
      topic: { subject, text: text.trim() },
    });
    if (!result.ok) {
      setBusy(false);
      setError(result.message);
      return;
    }
    if (!result.data.session) {
      setBusy(false);
      setError('The session did not start. Try again.');
      return;
    }
    // A full navigation, so the cookie set by this response is what the
    // session page reads.
    window.location.assign(PRODUCT_ROUTES.session(result.data.session.session.id));
  }

  return (
    <form
      id="start"
      aria-labelledby="guest-start-title"
      onSubmit={submit}
      noValidate
      className="nt-panel flex scroll-mt-20 flex-col gap-5 p-5 sm:p-6"
    >
      <h2 id="guest-start-title" className="nt-h2">
        Set it up yourself
      </h2>
      <p className="nt-small">
        The exact level, the subject, and what to work on, in your own words. Or press the big
        button above and just say it.
      </p>

      <ChoiceCards
        name="guest-level"
        legend="Grade level"
        value={level}
        onChange={setLevel}
        choices={LEVEL_CHOICES}
        columns={2}
      />

      <TopicFields
        idPrefix="guest"
        subject={subject}
        onSubjectChange={setSubject}
        text={text}
        onTextChange={(next) => {
          setText(next);
          if (topicError) setTopicError(null);
        }}
        textError={topicError}
        textRef={textRef}
        disabled={busy}
      />

      <ModeToggle idPrefix="guest-mode" mode={mode} onChange={setMode} />

      <FormError message={error} />

      <div className="flex flex-col gap-3">
        <NtButton type="submit" size="lg" busy={busy} className="w-full sm:w-auto">
          {busy ? 'Starting' : 'Start'}
        </NtButton>
        <p className="nt-small">Free. No account. Nothing is asked about you.</p>
        <p className="nt-small">Up to {publicConfig.guest.dailyMinutes} minutes a day.</p>
      </div>
    </form>
  );
}
