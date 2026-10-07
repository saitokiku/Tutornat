'use client';

import { useRef, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import type { GuestLevelId } from '@/kaizen.config';
import { publicConfig } from '@/kaizen.config';
import { guestApi, guestLevelFor } from '@/lib/tutor/client';
import type { Learner } from '@/lib/tutor/contracts';

import { NtButton } from '@/components/tutor/ui/button';
import { ChoiceCards, type Choice } from '@/components/tutor/ui/choice-cards';
import { FormError } from '@/components/tutor/ui/form-error';

/**
 * The guest's grade level, and the one way to change it (D35). Saving posts
 * the level with no topic, which re-levels the same guest on the server, and
 * then refreshes the page so the band the layout renders for matches. The
 * level is a content setting, not a date of birth, and the form says so.
 */

const LEVEL_CHOICES: ReadonlyArray<Choice<GuestLevelId>> = publicConfig.guestLevels.map(
  (level) => ({ value: level.id, label: level.label, description: level.hint }),
);

export function GuestLevelLine({ learner }: { learner: Pick<Learner, 'band' | 'birthYear'> }) {
  const router = useRouter();
  const current = guestLevelFor(learner, publicConfig.guestLevels);
  const [open, setOpen] = useState(false);
  const [level, setLevel] = useState<GuestLevelId>(current?.id ?? '4-5');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const changeButton = useRef<HTMLButtonElement>(null);

  function close() {
    setOpen(false);
    setError(null);
    changeButton.current?.focus();
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    const result = await guestApi.startGuest({ level });
    setBusy(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    const chosen = publicConfig.guestLevels.find((entry) => entry.id === level);
    toast.success(chosen ? `Level set to ${chosen.label}.` : 'Level saved.');
    close();
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="nt-small flex flex-wrap items-center gap-x-3 gap-y-1">
        <span>
          Level: <span className="font-medium text-foreground">{current?.label ?? 'Not set'}</span>
        </span>
        <NtButton
          ref={changeButton}
          tone="ghost"
          aria-expanded={open}
          aria-controls="guest-level-picker"
          onClick={() => (open ? close() : setOpen(true))}
        >
          Change
        </NtButton>
      </p>
      {open ? (
        <form
          id="guest-level-picker"
          onSubmit={save}
          noValidate
          className="nt-panel flex max-w-2xl flex-col gap-4 p-4 sm:p-5"
        >
          <ChoiceCards
            name="guest-level"
            legend="Grade level"
            value={level}
            onChange={setLevel}
            choices={LEVEL_CHOICES}
            columns={2}
            hint="Sets how the tutor talks and how long a session runs. It is not a date of birth, and nothing about you is stored."
          />
          <FormError message={error} />
          <div className="flex flex-wrap gap-3">
            <NtButton type="submit" busy={busy}>
              {busy ? 'Saving' : 'Save the level'}
            </NtButton>
            <NtButton type="button" tone="ghost" onClick={close} disabled={busy}>
              Cancel
            </NtButton>
          </div>
        </form>
      ) : null}
    </div>
  );
}
