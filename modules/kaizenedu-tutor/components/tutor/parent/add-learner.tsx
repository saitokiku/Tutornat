'use client';

import { useRef, useState, type FormEvent } from 'react';
import { toast } from 'sonner';

import {
  bandForBirthYear,
  bandLabel,
  firstErrorKey,
  hasErrors,
  needsTeenLogin,
  parentApi,
  PASSWORD_MIN_LENGTH,
  profileWillBeLocked,
  validateBirthYear,
  validateDisplayName,
  validateLoginName,
  validatePassword,
  type FieldErrors,
} from '@/lib/tutor/client';
import type { Learner } from '@/lib/tutor/contracts';

import { InlineNotice } from '@/components/tutor/shell/states';
import { NtButton } from '@/components/tutor/ui/button';
import { TextField } from '@/components/tutor/ui/fields';
import { FormError } from '@/components/tutor/ui/form-error';

type Field = 'displayName' | 'birthYear' | 'loginName' | 'password';
const ORDER: readonly Field[] = ['displayName', 'birthYear', 'loginName', 'password'];

/**
 * Adds a learner profile (spec R5). The birth year decides the band, and the
 * band decides what else the form asks for and what the profile can do: a
 * teen gets their own login, an under-13 profile is created locked while the
 * consent gate is shut (D5), and the form says so before it is submitted.
 */
export function AddLearnerForm({
  under13Open,
  onCreated,
  onCancel,
}: {
  under13Open: boolean;
  onCreated: (learner: Learner, locked: boolean) => void;
  onCancel?: () => void;
}) {
  const [displayName, setDisplayName] = useState('');
  const [birthYear, setBirthYear] = useState('');
  const [loginName, setLoginName] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<FieldErrors<Field>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const nameRef = useRef<HTMLInputElement>(null);
  const yearRef = useRef<HTMLInputElement>(null);
  const loginRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  const yearCheck = validateBirthYear(birthYear);
  const band = yearCheck.year === null ? null : bandForBirthYear(yearCheck.year);
  const teen = needsTeenLogin(band);
  const willLock = band !== null && profileWillBeLocked(band, under13Open);

  function focusFirst(next: FieldErrors<Field>) {
    const key = firstErrorKey(next, ORDER);
    if (key === 'displayName') nameRef.current?.focus();
    if (key === 'birthYear') yearRef.current?.focus();
    if (key === 'loginName') loginRef.current?.focus();
    if (key === 'password') passwordRef.current?.focus();
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const yearError =
      yearCheck.error ??
      (band === null ? 'Profiles start at age 4. Check the year.' : undefined) ??
      undefined;
    const next: FieldErrors<Field> = {
      displayName: validateDisplayName(displayName, 'a name for the profile') ?? undefined,
      birthYear: yearError,
      loginName: teen ? (validateLoginName(loginName) ?? undefined) : undefined,
      password: teen ? (validatePassword(password) ?? undefined) : undefined,
    };
    setErrors(next);
    setServerError(null);
    if (hasErrors(next) || yearCheck.year === null) {
      focusFirst(next);
      return;
    }
    setBusy(true);
    const result = await parentApi.createLearner({
      displayName: displayName.trim(),
      birthYear: yearCheck.year,
      ...(teen ? { loginName: loginName.trim(), password } : {}),
    });
    setBusy(false);
    if (!result.ok) {
      setServerError(result.message);
      return;
    }
    toast.success(`${result.data.learner.displayName} added.`);
    setDisplayName('');
    setBirthYear('');
    setLoginName('');
    setPassword('');
    setErrors({});
    onCreated(result.data.learner, result.data.locked);
  }

  return (
    <form onSubmit={submit} noValidate className="nt-panel flex flex-col gap-5 p-4 sm:p-6">
      <TextField
        ref={nameRef}
        id="learner-name"
        label="Display name"
        autoComplete="off"
        value={displayName}
        maxLength={60}
        onChange={(event) => setDisplayName(event.target.value)}
        error={errors.displayName}
        hint="What the tutor calls them. A first name is enough."
      />
      <TextField
        ref={yearRef}
        id="learner-birth-year"
        label="Birth year"
        inputMode="numeric"
        maxLength={4}
        value={birthYear}
        onChange={(event) => setBirthYear(event.target.value)}
        error={errors.birthYear}
        hint={
          band
            ? `${bandLabel(band)}. This sets session length, the tutor's register, and the safety rules.`
            : 'This sets session length, the tutor’s register, and the safety rules.'
        }
      />
      {willLock ? (
        <InlineNotice tone="warning" title="This profile will be created locked">
          Profiles for children under 13 are created locked: no session can start and nothing is
          recorded about the child until the parental-consent flow has been reviewed by counsel and
          the operator opens the gate. You can delete the profile at any time.
        </InlineNotice>
      ) : null}
      {teen ? (
        <>
          <TextField
            ref={loginRef}
            id="learner-login"
            label="Login name"
            autoComplete="off"
            value={loginName}
            onChange={(event) => setLoginName(event.target.value)}
            error={errors.loginName}
            hint="They sign in with this instead of an email. 3 to 24 letters, digits, dots, dashes, or underscores."
          />
          <TextField
            ref={passwordRef}
            id="learner-password"
            label="Password for this profile"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            error={errors.password}
            hint={`At least ${PASSWORD_MIN_LENGTH} characters. Give it to them; you can set a new one later.`}
          />
        </>
      ) : null}
      <FormError message={serverError} />
      <div className="flex flex-wrap gap-3">
        <NtButton type="submit" busy={busy}>
          {busy ? 'Adding the profile' : 'Add the profile'}
        </NtButton>
        {onCancel ? (
          <NtButton type="button" tone="ghost" onClick={onCancel}>
            Cancel
          </NtButton>
        ) : null}
      </div>
    </form>
  );
}
