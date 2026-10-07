'use client';

import { useRef, useState, type FormEvent } from 'react';
import { Check, Play, Plus, Undo2 } from 'lucide-react';
import { toast } from 'sonner';

import {
  groupPlannerItems,
  localIsoDate,
  plannerApi,
  plannerDueLabel,
  PLANNER_NOTES_MAX_LENGTH,
  PLANNER_TITLE_MAX_LENGTH,
  togglePlannerStatus,
  validatePlannerDueOn,
  validatePlannerNotes,
  validatePlannerTitle,
  type PlannerGroup,
} from '@/lib/tutor/client';
import type { PlannerItem, SessionTopic, SubjectId } from '@/lib/tutor/contracts';
import { SUBJECTS, subjectById } from '@/lib/tutor/graph/subjects';
import type { ListPlannerResponse } from '@/lib/tutor/wire';

import { EmptyState } from '@/components/tutor/shell/states';
import { Async } from '@/components/tutor/ui/async';
import { NtButton } from '@/components/tutor/ui/button';
import { SelectField, TextAreaField, TextField } from '@/components/tutor/ui/fields';
import { FormError } from '@/components/tutor/ui/form-error';
import { Pill, Section, type PillTone } from '@/components/tutor/ui/section';
import type { Loaded } from '@/components/tutor/ui/use-load';

/**
 * The planner (D35): what is due and what to do next, grouped by when. Every
 * open item carries the same action the start card does, a session on that
 * topic, so a test on Thursday is one press from a session about it. Done
 * and delete are one press each; there is no confirmation loop on delete.
 */
export function Planner({
  loaded,
  onStartTopic,
  starting,
  canStart,
}: {
  loaded: Loaded<ListPlannerResponse>;
  /** Start a topic session from an item, exactly as the start card would. */
  onStartTopic: (topic: SessionTopic) => void;
  starting: boolean;
  canStart: boolean;
}) {
  const [adding, setAdding] = useState(false);
  const addButton = useRef<HTMLButtonElement>(null);
  const today = localIsoDate();

  function upsert(item: PlannerItem) {
    loaded.setData((data) => ({
      items: data.items.some((entry) => entry.id === item.id)
        ? data.items.map((entry) => (entry.id === item.id ? item : entry))
        : [item, ...data.items],
    }));
  }

  function remove(id: string) {
    loaded.setData((data) => ({ items: data.items.filter((entry) => entry.id !== id) }));
  }

  function closeForm() {
    setAdding(false);
    addButton.current?.focus();
  }

  return (
    <Section
      id="planner"
      title="Planner"
      description="What is due, and what to do next. Start a session from any item."
      actions={
        <NtButton
          ref={addButton}
          tone="secondary"
          aria-expanded={adding}
          aria-controls="planner-add"
          onClick={() => setAdding((open) => !open)}
        >
          <Plus aria-hidden="true" />
          Add something
        </NtButton>
      }
    >
      {adding ? (
        <AddForm
          onDone={(item) => {
            upsert(item);
            closeForm();
          }}
          onCancel={closeForm}
        />
      ) : null}
      <Async loaded={loaded} label="Loading your planner" lines={3}>
        {(data) =>
          data.items.length === 0 ? (
            <EmptyState
              title="Nothing planned yet"
              body="Add a test, an assignment, or a reading with its due date, and start a session from it."
            />
          ) : (
            <div className="flex flex-col gap-6">
              {groupPlannerItems(data.items, today).map((group) => (
                <PlannerGroupList
                  key={group.key}
                  group={group}
                  today={today}
                  onChanged={upsert}
                  onRemoved={remove}
                  onStartTopic={onStartTopic}
                  starting={starting}
                  canStart={canStart}
                />
              ))}
            </div>
          )
        }
      </Async>
    </Section>
  );
}

const GROUP_TONE: Record<PlannerGroup['key'], PillTone> = {
  overdue: 'stop',
  today: 'warning',
  week: 'brand',
  later: 'neutral',
  done: 'success',
};

function PlannerGroupList({
  group,
  today,
  onChanged,
  onRemoved,
  onStartTopic,
  starting,
  canStart,
}: {
  group: PlannerGroup;
  today: string;
  onChanged: (item: PlannerItem) => void;
  onRemoved: (id: string) => void;
  onStartTopic: (topic: SessionTopic) => void;
  starting: boolean;
  canStart: boolean;
}) {
  const headingId = `planner-group-${group.key}`;
  return (
    <div className="flex flex-col gap-2">
      <h3 id={headingId} className="nt-h3">
        {group.label}
      </h3>
      <ul aria-labelledby={headingId} className="flex flex-col gap-3">
        {group.items.map((item) => (
          <PlannerRow
            key={item.id}
            item={item}
            tone={GROUP_TONE[group.key]}
            today={today}
            onChanged={onChanged}
            onRemoved={onRemoved}
            onStartTopic={onStartTopic}
            starting={starting}
            canStart={canStart}
          />
        ))}
      </ul>
    </div>
  );
}

function PlannerRow({
  item,
  tone,
  today,
  onChanged,
  onRemoved,
  onStartTopic,
  starting,
  canStart,
}: {
  item: PlannerItem;
  tone: PillTone;
  today: string;
  onChanged: (item: PlannerItem) => void;
  onRemoved: (id: string) => void;
  onStartTopic: (topic: SessionTopic) => void;
  starting: boolean;
  canStart: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const done = item.status === 'done';

  async function toggle() {
    setBusy(true);
    setError(null);
    const result = await plannerApi.update({
      id: item.id,
      status: togglePlannerStatus(item.status),
    });
    setBusy(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    onChanged(result.data.item);
  }

  async function remove() {
    setBusy(true);
    setError(null);
    const result = await plannerApi.remove({ id: item.id });
    setBusy(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    toast.success(`Deleted ${item.title}.`);
    onRemoved(item.id);
  }

  return (
    <li className="nt-panel flex flex-col gap-3 p-4 sm:p-5">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <h4 className="nt-h3 min-w-0 break-words">{item.title}</h4>
        <Pill>{subjectById(item.subject).label}</Pill>
        <Pill tone={done ? 'success' : tone}>
          {done ? 'Done' : plannerDueLabel(item.dueOn, today)}
        </Pill>
      </div>
      {item.notes ? (
        <p className="nt-small break-words whitespace-pre-wrap text-foreground/80">{item.notes}</p>
      ) : null}
      {error ? (
        <p role="alert" className="nt-small font-medium text-destructive">
          {error}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        {done ? null : (
          <NtButton
            busy={starting}
            disabled={!canStart}
            onClick={() => onStartTopic({ subject: item.subject, text: item.title })}
          >
            <Play aria-hidden="true" />
            Work on this
          </NtButton>
        )}
        <NtButton tone="secondary" busy={busy} onClick={() => void toggle()}>
          {done ? <Undo2 aria-hidden="true" /> : <Check aria-hidden="true" />}
          {done ? 'Not done' : 'Done'}
        </NtButton>
        <NtButton tone="ghost" busy={busy} onClick={() => void remove()}>
          Delete
        </NtButton>
      </div>
    </li>
  );
}

function AddForm({
  onDone,
  onCancel,
}: {
  onDone: (item: PlannerItem) => void;
  onCancel: () => void;
}) {
  const titleRef = useRef<HTMLInputElement>(null);
  const dueRef = useRef<HTMLInputElement>(null);
  const notesRef = useRef<HTMLTextAreaElement>(null);
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState<SubjectId>('math');
  const [dueOn, setDueOn] = useState('');
  const [notes, setNotes] = useState('');
  const [titleError, setTitleError] = useState<string | null>(null);
  const [dueError, setDueError] = useState<string | null>(null);
  const [notesError, setNotesError] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const nextTitle = validatePlannerTitle(title);
    const nextDue = validatePlannerDueOn(dueOn);
    const nextNotes = validatePlannerNotes(notes);
    setTitleError(nextTitle);
    setDueError(nextDue);
    setNotesError(nextNotes);
    if (nextTitle) {
      titleRef.current?.focus();
      return;
    }
    if (nextDue) {
      dueRef.current?.focus();
      return;
    }
    if (nextNotes) {
      notesRef.current?.focus();
      return;
    }
    setServerError(null);
    setBusy(true);
    const result = await plannerApi.create({
      title: title.trim(),
      subject,
      dueOn: dueOn.trim() || null,
      notes: notes.trim(),
    });
    setBusy(false);
    if (!result.ok) {
      setServerError(result.message);
      return;
    }
    toast.success('Added to your planner.');
    onDone(result.data.item);
  }

  return (
    <form
      id="planner-add"
      onSubmit={submit}
      noValidate
      className="nt-panel flex flex-col gap-4 p-4 sm:p-5"
    >
      <TextField
        ref={titleRef}
        id="planner-title"
        label="What is it"
        value={title}
        maxLength={PLANNER_TITLE_MAX_LENGTH}
        onChange={(event) => setTitle(event.target.value)}
        error={titleError}
        hint="A test, an assignment, a chapter. The session starts from these words."
        autoFocus
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField
          id="planner-subject"
          label="Subject"
          value={subject}
          onChange={(event) => setSubject(event.target.value as SubjectId)}
        >
          {SUBJECTS.map((entry) => (
            <option key={entry.id} value={entry.id}>
              {entry.label}
            </option>
          ))}
        </SelectField>
        <TextField
          ref={dueRef}
          id="planner-due"
          label="Due date (optional)"
          type="date"
          value={dueOn}
          onChange={(event) => setDueOn(event.target.value)}
          error={dueError}
        />
      </div>
      <TextAreaField
        ref={notesRef}
        id="planner-notes"
        label="Notes (optional)"
        value={notes}
        maxLength={PLANNER_NOTES_MAX_LENGTH}
        onChange={(event) => setNotes(event.target.value)}
        error={notesError}
      />
      <FormError message={serverError} />
      <div className="flex flex-wrap gap-3">
        <NtButton type="submit" busy={busy}>
          {busy ? 'Saving' : 'Add it'}
        </NtButton>
        <NtButton type="button" tone="ghost" onClick={onCancel}>
          Cancel
        </NtButton>
      </div>
    </form>
  );
}
