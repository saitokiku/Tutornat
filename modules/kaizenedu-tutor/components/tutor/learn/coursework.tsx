'use client';

import { useRef, useState, type FormEvent } from 'react';
import { FileText, Image as ImageIcon, ListChecks, Play } from 'lucide-react';
import { toast } from 'sonner';

import {
  courseworkStatusLabel,
  formatDate,
  tutorApi,
  UPLOAD_ACCEPT,
  validateProblemText,
  validateProblemTitle,
  validateUploadFile,
} from '@/lib/tutor/client';
import type { CourseworkItem, CourseworkSource } from '@/lib/tutor/contracts';
import type { ListCourseworkResponse } from '@/lib/tutor/wire';

import { EmptyState, InlineNotice } from '@/components/tutor/shell/states';
import { Async } from '@/components/tutor/ui/async';
import { MathText } from '@/components/tutor/ui/math-text';
import { NtButton } from '@/components/tutor/ui/button';
import { TextAreaField, TextField } from '@/components/tutor/ui/fields';
import { FormError } from '@/components/tutor/ui/form-error';
import { Pill, Section } from '@/components/tutor/ui/section';
import type { Loaded } from '@/components/tutor/ui/use-load';

/**
 * Homework (spec R3). For a learner who brought work, this is the spine of
 * the screen, so every ready problem carries the same action the hero button
 * does: start a session on it. A photo or PDF is read by the extractor and the
 * text comes back to check and correct, a problem can be typed instead, a
 * failed extraction can be retried or replaced by typing, and anything here
 * can be deleted.
 */

const SOURCE_LABEL: Record<CourseworkSource, string> = {
  upload: 'From a photo or PDF',
  text: 'Typed',
  skill: 'From the skill list',
};

type OpenForm = 'upload' | 'text' | null;

export function CourseworkManager({
  loaded,
  onStart,
  onAdded,
  starting,
  canStart,
}: {
  loaded: Loaded<ListCourseworkResponse>;
  /** Start a session on this problem, exactly as the hero button would. */
  onStart: (id: string) => void;
  /** Told about a newly added, ready problem, when a caller wants to react to it. */
  onAdded?: (id: string) => void;
  starting: boolean;
  canStart: boolean;
}) {
  const [openForm, setOpenForm] = useState<OpenForm>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const retryFiles = useRef(new Map<string, File>());
  const uploadButton = useRef<HTMLButtonElement>(null);
  const typeButton = useRef<HTMLButtonElement>(null);

  function upsert(item: CourseworkItem) {
    loaded.setData((data) => ({
      items: data.items.some((entry) => entry.id === item.id)
        ? data.items.map((entry) => (entry.id === item.id ? item : entry))
        : [item, ...data.items],
    }));
  }

  function remove(id: string) {
    retryFiles.current.delete(id);
    loaded.setData((data) => ({ items: data.items.filter((entry) => entry.id !== id) }));
  }

  function closeForm(which: OpenForm) {
    setOpenForm(null);
    if (which === 'upload') uploadButton.current?.focus();
    if (which === 'text') typeButton.current?.focus();
  }

  return (
    <Section
      id="coursework"
      title="Your homework"
      description="Take a photo of tonight's worksheet and start from it. The tutor reads the problem before the session begins."
      actions={
        <>
          <NtButton
            ref={uploadButton}
            tone="secondary"
            aria-expanded={openForm === 'upload'}
            aria-controls="coursework-upload"
            onClick={() => setOpenForm(openForm === 'upload' ? null : 'upload')}
          >
            <ImageIcon aria-hidden="true" />
            Add a photo or PDF
          </NtButton>
          <NtButton
            ref={typeButton}
            tone="secondary"
            aria-expanded={openForm === 'text'}
            aria-controls="coursework-type"
            onClick={() => setOpenForm(openForm === 'text' ? null : 'text')}
          >
            <FileText aria-hidden="true" />
            Type a problem
          </NtButton>
        </>
      }
    >
      {openForm === 'upload' ? (
        <UploadForm
          onDone={(item, file) => {
            if (item.status === 'failed') retryFiles.current.set(item.id, file);
            upsert(item);
            setEditingId(item.status === 'ready' ? item.id : null);
            if (item.status === 'ready') onAdded?.(item.id);
            closeForm('upload');
          }}
          onCancel={() => closeForm('upload')}
        />
      ) : null}
      {openForm === 'text' ? (
        <TypeForm
          onDone={(item) => {
            upsert(item);
            if (item.status === 'ready') onAdded?.(item.id);
            closeForm('text');
          }}
          onCancel={() => closeForm('text')}
        />
      ) : null}
      <Async loaded={loaded} label="Loading your problems" lines={3}>
        {(data) =>
          data.items.length === 0 ? (
            <EmptyState
              title="No homework added"
              body="Photograph the worksheet, upload a PDF, or type one problem, and a session can start from it."
            />
          ) : (
            <ul className="flex flex-col gap-3">
              {data.items.map((item) => (
                <CourseworkCard
                  key={item.id}
                  item={item}
                  editing={editingId === item.id}
                  retryFile={retryFiles.current.get(item.id) ?? null}
                  onEdit={(open) => setEditingId(open ? item.id : null)}
                  onChanged={upsert}
                  onRemoved={remove}
                  onReload={loaded.reload}
                  onStart={() => onStart(item.id)}
                  starting={starting}
                  canStart={canStart}
                />
              ))}
            </ul>
          )
        }
      </Async>
    </Section>
  );
}

function UploadForm({
  onDone,
  onCancel,
}: {
  onDone: (item: CourseworkItem, file: File) => void;
  onCancel: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    if (!file) {
      setError('Choose a photo or a PDF.');
      fileRef.current?.focus();
      return;
    }
    const invalid = validateUploadFile(file);
    if (invalid) {
      setError(invalid);
      fileRef.current?.focus();
      return;
    }
    setError(null);
    setServerError(null);
    setBusy(true);
    const result = await tutorApi.extractProblem(file, title);
    setBusy(false);
    if (!result.ok) {
      setServerError(result.message);
      return;
    }
    toast.success(
      result.data.coursework.status === 'failed'
        ? 'The file was saved, but the text could not be read.'
        : 'Added. Check the text before you start.',
    );
    onDone(result.data.coursework, file);
  }

  return (
    <form
      id="coursework-upload"
      onSubmit={submit}
      noValidate
      className="nt-panel flex flex-col gap-4 p-4 sm:p-5"
    >
      <div className="flex flex-col gap-1.5">
        <label htmlFor="coursework-file" className="text-[length:var(--nt-text-body)] font-medium">
          Photo or PDF
        </label>
        <p id="coursework-file-hint" className="nt-small">
          jpg, png, heic, or pdf, up to 20 MB. The file is read once to pull out the text; the image
          is not kept.
        </p>
        <input
          ref={fileRef}
          id="coursework-file"
          type="file"
          accept={UPLOAD_ACCEPT}
          aria-invalid={error ? true : undefined}
          aria-describedby={
            error ? 'coursework-file-hint coursework-file-error' : 'coursework-file-hint'
          }
          onChange={(event) => {
            setFile(event.target.files?.[0] ?? null);
            setError(null);
          }}
          className="nt-target w-full rounded-(--radius) border border-input bg-card px-3 py-2 text-[length:var(--nt-text-body)] file:mr-3 file:rounded-md file:border-0 file:bg-secondary file:px-3 file:py-1.5 file:text-sm file:font-medium"
        />
        {error ? (
          <p
            id="coursework-file-error"
            role="alert"
            className="nt-small font-medium text-destructive"
          >
            {error}
          </p>
        ) : null}
      </div>
      <TextField
        id="coursework-upload-title"
        label="Title (optional)"
        value={title}
        maxLength={120}
        onChange={(event) => setTitle(event.target.value)}
        hint="Something you will recognise, such as “Worksheet 12, questions 1 to 5”."
      />
      <FormError message={serverError} />
      <div className="flex flex-wrap gap-3">
        <NtButton type="submit" busy={busy}>
          {busy ? 'Reading the file' : 'Add it'}
        </NtButton>
        <NtButton type="button" tone="ghost" onClick={onCancel}>
          Cancel
        </NtButton>
      </div>
    </form>
  );
}

function TypeForm({
  onDone,
  onCancel,
  initialTitle = '',
}: {
  onDone: (item: CourseworkItem) => void;
  onCancel: () => void;
  initialTitle?: string;
}) {
  const titleRef = useRef<HTMLInputElement>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const [title, setTitle] = useState(initialTitle);
  const [text, setText] = useState('');
  const [titleError, setTitleError] = useState<string | null>(null);
  const [textError, setTextError] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const nextTitle = validateProblemTitle(title);
    const nextText = validateProblemText(text);
    setTitleError(nextTitle);
    setTextError(nextText);
    if (nextTitle) {
      titleRef.current?.focus();
      return;
    }
    if (nextText) {
      textRef.current?.focus();
      return;
    }
    setServerError(null);
    setBusy(true);
    const result = await tutorApi.createCoursework({ title: title.trim(), text: text.trim() });
    setBusy(false);
    if (!result.ok) {
      setServerError(result.message);
      return;
    }
    toast.success('Added to your problems.');
    onDone(result.data.item);
  }

  return (
    <form
      id="coursework-type"
      onSubmit={submit}
      noValidate
      className="nt-panel flex flex-col gap-4 p-4 sm:p-5"
    >
      <TextField
        ref={titleRef}
        id="coursework-title"
        label="Title"
        value={title}
        maxLength={120}
        onChange={(event) => setTitle(event.target.value)}
        error={titleError}
      />
      <TextAreaField
        ref={textRef}
        id="coursework-text"
        label="The problem"
        value={text}
        maxLength={4000}
        onChange={(event) => setText(event.target.value)}
        error={textError}
        hint="Copy it out as it is written. Fractions can be typed as 3/4."
      />
      <FormError message={serverError} />
      <div className="flex flex-wrap gap-3">
        <NtButton type="submit" busy={busy}>
          {busy ? 'Saving' : 'Save the problem'}
        </NtButton>
        <NtButton type="button" tone="ghost" onClick={onCancel}>
          Cancel
        </NtButton>
      </div>
    </form>
  );
}

function CourseworkCard({
  item,
  editing,
  retryFile,
  onEdit,
  onChanged,
  onRemoved,
  onReload,
  onStart,
  starting,
  canStart,
}: {
  item: CourseworkItem;
  editing: boolean;
  retryFile: File | null;
  onEdit: (open: boolean) => void;
  onChanged: (item: CourseworkItem) => void;
  onRemoved: (id: string) => void;
  onReload: () => void;
  onStart: () => void;
  starting: boolean;
  canStart: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [typing, setTyping] = useState(false);

  async function remove() {
    setBusy(true);
    const result = await tutorApi.deleteCoursework({ id: item.id });
    setBusy(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    toast.success(`Deleted ${item.title}.`);
    onRemoved(item.id);
  }

  async function retry() {
    if (!retryFile) return;
    setBusy(true);
    setError(null);
    const result = await tutorApi.extractProblem(retryFile, item.title);
    if (!result.ok) {
      setBusy(false);
      setError(result.message);
      return;
    }
    await tutorApi.deleteCoursework({ id: item.id });
    setBusy(false);
    onRemoved(item.id);
    onChanged(result.data.coursework);
    toast.success(
      result.data.coursework.status === 'failed'
        ? 'It could not be read this time either. Typing it is the reliable way.'
        : 'Read on the second try. Check the text.',
    );
  }

  return (
    <li className="nt-panel flex flex-col gap-3 p-4 sm:p-5">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <h3 className="nt-h3 min-w-0 break-words">{item.title}</h3>
        <Pill>{SOURCE_LABEL[item.source]}</Pill>
        <Pill
          tone={item.status === 'failed' ? 'stop' : item.status === 'ready' ? 'success' : 'warning'}
        >
          {courseworkStatusLabel(item.status)}
        </Pill>
        <span className="nt-small">{formatDate(item.createdAt)}</span>
      </div>

      {item.status === 'extracting' ? (
        <InlineNotice title="Still reading the file">
          This usually takes a few seconds. Refresh the list to see the text.
        </InlineNotice>
      ) : null}

      {item.status === 'failed' ? (
        <InlineNotice tone="warning" title="The text could not be read">
          A blurry photo or handwriting is the usual reason. Try the file again, or type the problem
          instead.
        </InlineNotice>
      ) : null}

      {item.text && !editing ? (
        <p className="nt-body break-words whitespace-pre-wrap text-muted-foreground">
          <MathText>{item.text}</MathText>
        </p>
      ) : null}

      {editing ? (
        <EditForm
          item={item}
          onSaved={(next) => {
            onChanged(next);
            onEdit(false);
          }}
          onCancel={() => onEdit(false)}
        />
      ) : null}

      {typing ? (
        <TypeForm
          initialTitle={item.title}
          onDone={(created) => {
            setTyping(false);
            onChanged(created);
            void remove();
          }}
          onCancel={() => setTyping(false)}
        />
      ) : null}

      {error ? (
        <p role="alert" className="nt-small font-medium text-destructive">
          {error}
        </p>
      ) : null}

      {editing || typing ? null : (
        <div className="flex flex-wrap gap-2">
          {item.status === 'ready' ? (
            <NtButton busy={starting} disabled={!canStart} onClick={onStart}>
              <Play aria-hidden="true" />
              Start on this
            </NtButton>
          ) : null}
          {item.status === 'ready' ? (
            <NtButton tone="secondary" onClick={() => onEdit(true)}>
              <ListChecks aria-hidden="true" />
              Check the text
            </NtButton>
          ) : null}
          {item.status === 'extracting' ? (
            <NtButton tone="secondary" onClick={onReload}>
              Refresh
            </NtButton>
          ) : null}
          {item.status === 'failed' && retryFile ? (
            <NtButton tone="secondary" busy={busy} onClick={() => void retry()}>
              Try that file again
            </NtButton>
          ) : null}
          {item.status === 'failed' ? (
            <NtButton tone="secondary" onClick={() => setTyping(true)}>
              Type it instead
            </NtButton>
          ) : null}
          <NtButton tone="ghost" busy={busy} onClick={() => void remove()}>
            Delete
          </NtButton>
        </div>
      )}
    </li>
  );
}

function EditForm({
  item,
  onSaved,
  onCancel,
}: {
  item: CourseworkItem;
  onSaved: (item: CourseworkItem) => void;
  onCancel: () => void;
}) {
  const titleRef = useRef<HTMLInputElement>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const [title, setTitle] = useState(item.title);
  const [text, setText] = useState(item.text ?? '');
  const [titleError, setTitleError] = useState<string | null>(null);
  const [textError, setTextError] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const changed = title !== item.title || text !== (item.text ?? '');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const nextTitle = validateProblemTitle(title);
    const nextText = validateProblemText(text);
    setTitleError(nextTitle);
    setTextError(nextText);
    if (nextTitle) {
      titleRef.current?.focus();
      return;
    }
    if (nextText) {
      textRef.current?.focus();
      return;
    }
    setServerError(null);
    setBusy(true);
    const result = await tutorApi.updateCoursework({
      id: item.id,
      title: title.trim(),
      text: text.trim(),
    });
    setBusy(false);
    if (!result.ok) {
      setServerError(result.message);
      return;
    }
    toast.success('Saved.');
    onSaved(result.data.item);
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4 border-t border-border pt-4">
      <TextField
        ref={titleRef}
        id={`edit-title-${item.id}`}
        label="Title"
        value={title}
        maxLength={120}
        onChange={(event) => setTitle(event.target.value)}
        error={titleError}
      />
      <TextAreaField
        ref={textRef}
        id={`edit-text-${item.id}`}
        label="The problem, as the tutor will read it"
        value={text}
        maxLength={4000}
        onChange={(event) => setText(event.target.value)}
        error={textError}
        hint="Fix anything the reader got wrong before you start."
      />
      <FormError message={serverError} />
      <div className="flex flex-wrap gap-3">
        <NtButton type="submit" busy={busy} disabled={!changed}>
          {busy ? 'Saving' : 'Save changes'}
        </NtButton>
        <NtButton type="button" tone="ghost" onClick={onCancel}>
          Close
        </NtButton>
      </div>
    </form>
  );
}
