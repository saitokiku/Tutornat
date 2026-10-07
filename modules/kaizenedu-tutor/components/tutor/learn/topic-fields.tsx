'use client';

import type { Ref } from 'react';

import { TOPIC_TEXT_MAX_LENGTH } from '@/lib/tutor/client';
import type { SubjectId } from '@/lib/tutor/contracts';
import { SUBJECTS, subjectById } from '@/lib/tutor/graph/subjects';
import { cn } from '@/lib/utils';

import { TextField } from '@/components/tutor/ui/fields';

/**
 * The two fields a topic session needs (D35): a subject, as a row of radio
 * chips, and the learner's own words. Shared by the landing page's start form
 * and the start card on /learn so the two never drift. The subject's example
 * is the placeholder, so the field shows what "your own words" means without
 * a sentence of instructions above it.
 */
export function TopicFields({
  idPrefix,
  subject,
  onSubjectChange,
  text,
  onTextChange,
  textError,
  textLabel = 'What do you want to work on?',
  textRef,
  disabled = false,
}: {
  idPrefix: string;
  subject: SubjectId;
  onSubjectChange: (subject: SubjectId) => void;
  text: string;
  onTextChange: (text: string) => void;
  textError: string | null;
  textLabel?: string;
  textRef?: Ref<HTMLInputElement>;
  disabled?: boolean;
}) {
  const example = subjectById(subject).example;
  return (
    <div className="flex min-w-0 flex-col gap-4">
      <fieldset className="flex min-w-0 flex-col gap-2" disabled={disabled}>
        <legend className="mb-1 text-[length:var(--nt-text-body)] font-medium">Subject</legend>
        <div className="flex flex-wrap gap-2">
          {SUBJECTS.map((entry) => {
            const id = `${idPrefix}-subject-${entry.id}`;
            const selected = entry.id === subject;
            return (
              <label
                key={entry.id}
                htmlFor={id}
                className={cn(
                  'nt-target inline-flex cursor-pointer items-center rounded-full border px-4 text-[length:var(--nt-text-body)] font-medium transition-colors has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ring',
                  selected
                    ? 'border-primary bg-accent text-accent-foreground'
                    : 'border-border bg-card text-muted-foreground hover:border-input hover:text-foreground',
                  disabled && 'cursor-not-allowed opacity-60',
                )}
              >
                <input
                  id={id}
                  type="radio"
                  name={`${idPrefix}-subject`}
                  value={entry.id}
                  checked={selected}
                  onChange={() => onSubjectChange(entry.id)}
                  className="sr-only"
                />
                {entry.label}
              </label>
            );
          })}
        </div>
      </fieldset>
      <TextField
        ref={textRef}
        id={`${idPrefix}-topic`}
        label={textLabel}
        value={text}
        onChange={(event) => onTextChange(event.target.value)}
        placeholder={example}
        maxLength={TOPIC_TEXT_MAX_LENGTH}
        error={textError}
        autoComplete="off"
        disabled={disabled}
      />
    </div>
  );
}
