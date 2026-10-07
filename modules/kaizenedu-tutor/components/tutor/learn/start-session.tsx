'use client';

import { useCallback, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Mic, Keyboard, ChevronDown, Play } from 'lucide-react';

import type { AgeBand } from '@/kaizen.config';
import { publicConfig } from '@/kaizen.config';
import {
  checkStartSelection,
  formatMinutes,
  sessionMinutesFor,
  tutorApi,
} from '@/lib/tutor/client';
import type { CourseworkItem, InputMode, SkillNode, SubjectId } from '@/lib/tutor/contracts';
import { PRODUCT_ROUTES } from '@/lib/tutor/contracts';
import type { CreateSessionRequest } from '@/lib/tutor/wire';
import { cn } from '@/lib/utils';

import { InlineNotice } from '@/components/tutor/shell/states';
import { NtButton } from '@/components/tutor/ui/button';
import { FormError } from '@/components/tutor/ui/form-error';

import { TopicFields } from './topic-fields';
import { createRemembered } from './use-remembered';

/**
 * The one thing this screen exists for (spec R1, R13, D35). It is
 * topic-first for everyone: say the subject and what you want to work on, in
 * your own words, and press Start. Homework you added and the fractions
 * sequence are one disclosure underneath, not a form to fill in first.
 */

/**
 * Voice or text, remembered per browser. A learner on a machine with no
 * microphone should not have to re-choose text every day, and the choice is a
 * preference rather than a record, so it never leaves the browser.
 */
export const useRememberedMode = createRemembered<InputMode>(
  'nt.learn.mode',
  (raw) => (raw === 'text' ? 'text' : 'voice'),
  'voice',
);

export interface SessionStarter {
  busy: boolean;
  error: string | null;
  start: (body: CreateSessionRequest) => Promise<void>;
}

/**
 * Creates the session and moves to it. Shared, so the button in the hero, the
 * button on a piece of homework and "Work on this" in the planner do exactly
 * the same thing.
 */
export function useSessionStarter(): SessionStarter {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const start = useCallback(
    async (body: CreateSessionRequest) => {
      if (busy) return;
      setBusy(true);
      setError(null);
      const result = await tutorApi.createSession(body);
      if (!result.ok) {
        setBusy(false);
        setError(result.message);
        return;
      }
      router.push(PRODUCT_ROUTES.session(result.data.session.id));
    },
    [busy, router],
  );

  return { busy, error, start };
}

export function StartCard({
  items,
  nextSkill,
  hasMastery,
  progressLoading,
  band,
  remainingMinutes,
  blockedReason,
  mode,
  onModeChange,
  starter,
  onStartCoursework,
}: {
  items: CourseworkItem[];
  nextSkill: SkillNode | null;
  /** Whether any mastery row exists; without one the way into the graph is the placement check. */
  hasMastery: boolean;
  progressLoading: boolean;
  band: AgeBand | null;
  remainingMinutes: number;
  blockedReason: string | null;
  mode: InputMode;
  onModeChange: (mode: InputMode) => void;
  starter: SessionStarter;
  /** Start on a piece of homework, exactly as its own button would. */
  onStartCoursework: (id: string) => void;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [subject, setSubject] = useState<SubjectId>('math');
  const [text, setText] = useState('');
  const [topicError, setTopicError] = useState<string | null>(null);
  const textRef = useRef<HTMLInputElement>(null);

  const ready = items.filter((item) => item.status === 'ready');
  const planned = sessionMinutesFor(band, publicConfig.bands, remainingMinutes);
  const full = publicConfig.bands[band ?? 'adult'].sessionMinutes;
  const blocked = Boolean(blockedReason);

  async function startTopic() {
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
    await starter.start(checked.body);
  }

  async function startSequence(skillId: string | null) {
    const checked = checkStartSelection({
      source: 'next_skill',
      courseworkId: null,
      skillId,
      mode,
    });
    if (checked.ok) await starter.start(checked.body);
  }

  return (
    <section aria-labelledby="start-title" id="start" className="scroll-mt-20">
      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          if (!blocked) void startTopic();
        }}
        className="nt-panel flex flex-col gap-5 p-5 sm:p-7"
      >
        <div className="flex flex-col gap-1.5">
          <p className="nt-label">Start here</p>
          <h2 id="start-title" className="nt-h1">
            What do you want to work on?
          </h2>
        </div>

        {blockedReason ? (
          <InlineNotice tone="stop" role="alert" title="No session can start right now">
            {blockedReason}
          </InlineNotice>
        ) : null}

        <TopicFields
          idPrefix="start"
          subject={subject}
          onSubjectChange={setSubject}
          text={text}
          onTextChange={(next) => {
            setText(next);
            if (topicError) setTopicError(null);
          }}
          textError={topicError}
          textLabel="In your own words"
          textRef={textRef}
          disabled={blocked}
        />

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-5">
          <NtButton
            type="submit"
            size="lg"
            busy={starter.busy}
            disabled={blocked}
            className="w-full sm:w-auto"
          >
            {starter.busy ? 'Starting the session' : 'Start'}
          </NtButton>
          <ModeToggle idPrefix="start-mode" mode={mode} onChange={onModeChange} />
        </div>

        <FormError message={starter.error} />

        <p className="nt-small">
          {planned <= 0
            ? 'A session needs minutes left.'
            : planned < full
              ? `Only ${formatMinutes(planned)} left, so this session runs that long.`
              : `${formatMinutes(planned)} long, and it ends on time. You can stop earlier.`}{' '}
          The {publicConfig.product.aiLabel} label stays on screen the whole time.
        </p>

        <div className="border-t border-border pt-4">
          <button
            type="button"
            aria-expanded={pickerOpen}
            aria-controls="start-picker"
            onClick={() => setPickerOpen((open) => !open)}
            className="nt-target inline-flex items-center gap-1.5 rounded-(--radius) text-[length:var(--nt-text-body)] font-medium text-muted-foreground hover:text-foreground"
          >
            Or pick up where you left off
            <ChevronDown
              className={cn('size-4 transition-transform', pickerOpen && 'rotate-180')}
              aria-hidden="true"
            />
          </button>
          <div id="start-picker" hidden={!pickerOpen} className="pt-3">
            <PickUpList
              ready={ready}
              nextSkill={nextSkill}
              hasMastery={hasMastery}
              progressLoading={progressLoading}
              busy={starter.busy}
              disabled={blocked}
              onStartCoursework={onStartCoursework}
              onStartSequence={(skillId) => void startSequence(skillId)}
            />
          </div>
        </div>
      </form>
    </section>
  );
}

/**
 * The ways back into work already begun: each ready piece of homework, and
 * the fractions sequence, which starts with a placement check for a learner
 * with no mastery rows and with the next skill after that. A skill id such as
 * F7 is never shown to anyone; the skill's name is.
 */
function PickUpList({
  ready,
  nextSkill,
  hasMastery,
  progressLoading,
  busy,
  disabled,
  onStartCoursework,
  onStartSequence,
}: {
  ready: CourseworkItem[];
  nextSkill: SkillNode | null;
  hasMastery: boolean;
  progressLoading: boolean;
  busy: boolean;
  disabled: boolean;
  onStartCoursework: (id: string) => void;
  onStartSequence: (skillId: string | null) => void;
}) {
  const sequence = progressLoading
    ? null
    : hasMastery && nextSkill
      ? {
          label: `The fractions sequence: ${nextSkill.name}`,
          hint: 'Picked from your last checks and what this skill needs first.',
          skillId: nextSkill.id,
        }
      : hasMastery
        ? null
        : {
            label: 'A short placement check for fractions',
            hint: 'Finds where to begin in the fractions-to-pre-algebra sequence, then works from there.',
            skillId: null,
          };

  return (
    <ul className="flex flex-col gap-2">
      {ready.map((item) => (
        <PickUpRow
          key={item.id}
          label={item.title}
          hint="Homework you added. The tutor reads it before you start."
          buttonLabel="Start on it"
          busy={busy}
          disabled={disabled}
          onStart={() => onStartCoursework(item.id)}
        />
      ))}
      {sequence ? (
        <PickUpRow
          label={sequence.label}
          hint={sequence.hint}
          buttonLabel="Start"
          busy={busy}
          disabled={disabled}
          onStart={() => onStartSequence(sequence.skillId)}
        />
      ) : null}
      {progressLoading ? (
        <li className="nt-small py-2">Getting your place in the sequence.</li>
      ) : null}
      {ready.length === 0 ? (
        <li className="nt-small py-2">
          Add a photo of your homework below and it appears here to start from.
        </li>
      ) : null}
    </ul>
  );
}

function PickUpRow({
  label,
  hint,
  buttonLabel,
  busy,
  disabled,
  onStart,
}: {
  label: string;
  hint: string;
  buttonLabel: string;
  busy: boolean;
  disabled: boolean;
  onStart: () => void;
}) {
  return (
    <li className="flex flex-col gap-3 rounded-(--radius) border border-border p-3 sm:flex-row sm:items-center sm:justify-between">
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="min-w-0 font-medium break-words">{label}</span>
        <span className="nt-small">{hint}</span>
      </span>
      <NtButton
        type="button"
        tone="secondary"
        busy={busy}
        disabled={disabled}
        onClick={onStart}
        className="shrink-0 self-start sm:self-auto"
      >
        <Play aria-hidden="true" />
        {buttonLabel}
      </NtButton>
    </li>
  );
}

/** Voice or text, as a two-option radio group that reads as one control. */
export function ModeToggle({
  idPrefix = 'start-mode',
  mode,
  onChange,
}: {
  idPrefix?: string;
  mode: InputMode;
  onChange: (mode: InputMode) => void;
}) {
  const options: ReadonlyArray<{ value: InputMode; label: string; Icon: typeof Mic }> = [
    { value: 'voice', label: 'Voice', Icon: Mic },
    { value: 'text', label: 'Text', Icon: Keyboard },
  ];
  return (
    <fieldset className="flex min-w-0 flex-col gap-1.5">
      <legend className="nt-label">Talk or type</legend>
      <div className="inline-flex rounded-(--radius) border border-border bg-muted p-1">
        {options.map(({ value, label, Icon }) => {
          const selected = mode === value;
          return (
            <label
              key={value}
              htmlFor={`${idPrefix}-${value}`}
              className={cn(
                'inline-flex cursor-pointer items-center gap-2 rounded-[calc(var(--radius)-0.25rem)] px-4 py-2 text-[length:var(--nt-text-body)] font-medium transition-colors has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ring',
                selected ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground',
              )}
            >
              <input
                id={`${idPrefix}-${value}`}
                type="radio"
                name={idPrefix}
                value={value}
                checked={selected}
                onChange={() => onChange(value)}
                className="sr-only"
              />
              <Icon className="size-4" aria-hidden="true" />
              {label}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
