'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Keyboard, Mic } from 'lucide-react';

import { publicConfig } from '@/kaizen.config';
import { guestApi } from '@/lib/tutor/client';
import type { InputMode } from '@/lib/tutor/contracts';
import { PRODUCT_ROUTES } from '@/lib/tutor/contracts';
import { unlockAudio } from '@/lib/tutor/voice/audio-context';
import { releaseEarlyMicrophone, requestMicrophoneEarly } from '@/lib/tutor/voice/recorder';

import { NtButton } from '@/components/tutor/ui/button';
import { FormError } from '@/components/tutor/ui/form-error';

import { GuestStart, useRememberedLevel } from './guest-start';

const LEVELS = publicConfig.guestLevels;

/**
 * The front door (D36): a row of levels, one big button, and "type instead".
 * The press does everything inside the one user gesture that browsers allow
 * audio to start in: it unlocks the AudioContext, asks for the microphone,
 * creates the guest and an open session in one call, and moves to the live
 * screen with a client-side navigation so the unlocked context survives. The
 * session screen sees `?go=1` and starts itself; the tutor speaks first and
 * asks what the learner is working on.
 *
 * The full form (every level with its hint, a subject, words, voice or text)
 * is one disclosure underneath, for grown-ups and for anyone who would
 * rather set it up than say it.
 */
export function TalkStart() {
  const router = useRouter();
  const [level, setLevel] = useRememberedLevel();
  const [busy, setBusy] = useState<InputMode | null>(null);
  const [error, setError] = useState<string | null>(null);
  const name = publicConfig.product.tutorName;

  async function go(mode: InputMode) {
    if (busy) return;
    setBusy(mode);
    setError(null);
    // Inside the gesture: audio can only be unlocked here, and the microphone
    // prompt is up while the session is being created.
    void unlockAudio();
    if (mode === 'voice') requestMicrophoneEarly();
    const result = await guestApi.startGuest({ level, mode, open: true });
    if (!result.ok) {
      releaseEarlyMicrophone();
      setBusy(null);
      setError(result.message);
      return;
    }
    if (!result.data.session) {
      releaseEarlyMicrophone();
      setBusy(null);
      setError('The session did not start. Try again.');
      return;
    }
    router.push(`${PRODUCT_ROUTES.session(result.data.session.session.id)}?go=1`);
  }

  return (
    <div className="nt-panel nt-talk-start p-5 sm:p-6" id="talk">
      <fieldset className="flex flex-col gap-2" disabled={busy !== null}>
        <legend className="mb-1 text-[length:var(--nt-text-body)] font-medium">I am in</legend>
        <div className="nt-level-row">
          {LEVELS.map((entry) => (
            <label key={entry.id} className="nt-level-chip" htmlFor={`talk-level-${entry.id}`}>
              <input
                id={`talk-level-${entry.id}`}
                className="sr-only"
                type="radio"
                name="talk-level"
                value={entry.id}
                checked={level === entry.id}
                onChange={() => setLevel(entry.id)}
              />
              {entry.short}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="flex flex-col gap-3">
        <NtButton
          size="lg"
          className="nt-big-button w-full"
          onClick={() => void go('voice')}
          busy={busy === 'voice'}
          disabled={busy !== null}
        >
          <Mic className="size-6" aria-hidden="true" />
          {busy === 'voice' ? 'Starting' : `Talk to ${name}`}
        </NtButton>
        <NtButton
          tone="secondary"
          size="lg"
          className="w-full"
          onClick={() => void go('text')}
          busy={busy === 'text'}
          disabled={busy !== null}
        >
          <Keyboard className="size-5" aria-hidden="true" />
          {busy === 'text' ? 'Starting' : 'Type instead'}
        </NtButton>
        <FormError message={error} />
        <p className="nt-small">
          Free. No account. Nothing is asked about you. {name} says hello first and asks what you
          are working on.
        </p>
      </div>

      <details className="group flex flex-col gap-4">
        <summary className="nt-body cursor-pointer list-none font-medium underline underline-offset-4">
          Grown-ups: set the exact level, pick a subject, or type what to work on
        </summary>
        <div className="mt-4">
          <GuestStart />
        </div>
      </details>
    </div>
  );
}
