'use client';

import { useRef, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import {
  auth,
  bandForBirthYear,
  bandLabel,
  firstErrorKey,
  hasErrors,
  PASSWORD_MIN_LENGTH,
  validateBirthYear,
  validateDisplayName,
  validateEmail,
  validateLoginName,
  validatePassword,
  type FieldErrors,
} from '@/lib/tutor/client';
import { homeForRole } from '@/lib/tutor/client/navigation';
import { PRODUCT_ROUTES } from '@/lib/tutor/contracts';
import type { TeenInviteResponse } from '@/lib/tutor/wire';

import { NtButton } from '@/components/tutor/ui/button';
import { ChoiceCards } from '@/components/tutor/ui/choice-cards';
import { TextField } from '@/components/tutor/ui/fields';
import { FormError } from '@/components/tutor/ui/form-error';

type Kind = 'parent' | 'adult';
type Field = 'kind' | 'birthYear' | 'displayName' | 'email' | 'loginName' | 'password';
const ORDER: readonly Field[] = [
  'kind',
  'birthYear',
  'displayName',
  'email',
  'loginName',
  'password',
];

/**
 * One form from the landing page to the dashboard (spec R13: three clicks to
 * a session). Parents and adults both get an account; adults also answer a
 * neutral birth-year question (R10) that sets their session defaults.
 *
 * A 13-to-17 answer turns the same form into the teen's half of sign-up
 * (D30): a login name and a password of their own, and a parent's email — no
 * email of theirs. The parent gets a link and finishes; the teen signs in
 * with the login name. Under 13 posts the same form and gets the neutral
 * refusal the server gives (no nudging, §11.2 item 1).
 */
export function SignUpForm() {
  const router = useRouter();
  const [kind, setKind] = useState<Kind | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [loginName, setLoginName] = useState('');
  const [password, setPassword] = useState('');
  const [birthYear, setBirthYear] = useState('');
  const [errors, setErrors] = useState<FieldErrors<Field>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [invited, setInvited] = useState<TeenInviteResponse | null>(null);

  const nameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const loginRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const yearRef = useRef<HTMLInputElement>(null);

  const yearCheck = validateBirthYear(birthYear);
  const previewBand = yearCheck.year !== null ? bandForBirthYear(yearCheck.year) : null;
  const teenPath = kind === 'adult' && previewBand === '13-17';

  function focusFirst(next: FieldErrors<Field>) {
    const key = firstErrorKey(next, ORDER);
    if (key === 'kind') document.getElementById('kind-parent')?.focus();
    if (key === 'birthYear') yearRef.current?.focus();
    if (key === 'displayName') nameRef.current?.focus();
    if (key === 'email') emailRef.current?.focus();
    if (key === 'loginName') loginRef.current?.focus();
    if (key === 'password') passwordRef.current?.focus();
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const next: FieldErrors<Field> = {
      kind: kind ? undefined : 'Choose who the account is for.',
      birthYear: kind === 'adult' ? (yearCheck.error ?? undefined) : undefined,
      displayName: validateDisplayName(displayName, 'your name') ?? undefined,
      email: validateEmail(email) ?? undefined,
      loginName: teenPath ? (validateLoginName(loginName) ?? undefined) : undefined,
      password: validatePassword(password) ?? undefined,
    };
    setErrors(next);
    setServerError(null);
    if (hasErrors(next) || !kind) {
      focusFirst(next);
      return;
    }
    setBusy(true);
    if (teenPath && yearCheck.year !== null) {
      const result = await auth.teenInvite({
        displayName: displayName.trim(),
        birthYear: yearCheck.year,
        loginName: loginName.trim(),
        password,
        parentEmail: email.trim(),
      });
      setBusy(false);
      if (!result.ok) {
        setServerError(result.message);
        return;
      }
      if (result.data.delivery === 'failed') {
        setServerError(result.data.message);
        return;
      }
      setInvited(result.data);
      return;
    }
    const result = await auth.signUp({
      kind,
      displayName: displayName.trim(),
      email: email.trim(),
      password,
      birthYear: kind === 'adult' ? (yearCheck.year ?? undefined) : undefined,
    });
    if (!result.ok) {
      setBusy(false);
      setServerError(result.message);
      return;
    }
    router.push(homeForRole(result.data.principal.role));
  }

  if (invited) {
    const sent = invited.delivery === 'sent';
    return (
      <div className="nt-panel flex flex-col gap-3 p-6" role="status">
        <h2 className="nt-h3">
          {sent ? 'Check with your parent' : 'Email is not set up on this deployment'}
        </h2>
        <p className="nt-body">{invited.message}</p>
        {sent ? (
          <p className="nt-body">
            Your login name is <strong>{invited.loginName}</strong>. Keep it: you sign in with it,
            not with an email.
          </p>
        ) : null}
        <p className="nt-small">
          <Link href={PRODUCT_ROUTES.signIn} className="underline underline-offset-4">
            Go to sign in
          </Link>
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-6">
      <ChoiceCards<Kind>
        name="kind"
        legend="This account is for"
        value={kind}
        onChange={(value) => {
          setKind(value);
          setErrors((current) => ({ ...current, kind: undefined }));
        }}
        error={errors.kind}
        choices={[
          {
            value: 'parent',
            label: 'I’m a parent',
            description: 'You add learner profiles for your kids and see their progress.',
          },
          {
            value: 'adult',
            label: 'I’m learning for myself',
            description: 'One profile, yours. Start a session right after this form.',
          },
        ]}
      />
      {kind === 'adult' ? (
        <TextField
          ref={yearRef}
          id="birthYear"
          label="Birth year"
          inputMode="numeric"
          autoComplete="bday-year"
          maxLength={4}
          value={birthYear}
          onChange={(event) => setBirthYear(event.target.value)}
          error={errors.birthYear}
          hint={
            previewBand && !yearCheck.error
              ? `Sets session length and defaults for ${bandLabel(previewBand).toLowerCase()}. Not shown to anyone.`
              : 'Sets session length and defaults. Not shown to anyone.'
          }
        />
      ) : null}
      <TextField
        ref={nameRef}
        id="displayName"
        label={teenPath ? 'Your first name' : 'Your name'}
        autoComplete={teenPath ? 'given-name' : 'name'}
        value={displayName}
        onChange={(event) => setDisplayName(event.target.value)}
        error={errors.displayName}
        hint="What the tutor and the dashboard call you."
      />
      <TextField
        ref={emailRef}
        id="email"
        label={teenPath ? 'A parent’s email' : 'Email'}
        type="email"
        autoComplete={teenPath ? 'off' : 'email'}
        inputMode="email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        error={errors.email}
        hint={
          teenPath
            ? 'We send them a link to finish setting up the account. You do not need an email of your own.'
            : undefined
        }
      />
      {teenPath ? (
        <TextField
          ref={loginRef}
          id="loginName"
          label="Login name"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          value={loginName}
          onChange={(event) => setLoginName(event.target.value)}
          error={errors.loginName}
          hint="3 to 24 characters: lowercase letters, digits, underscore or dot. You sign in with it."
        />
      ) : null}
      <TextField
        ref={passwordRef}
        id="password"
        label="Password"
        type="password"
        autoComplete="new-password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        error={errors.password}
        hint={
          teenPath
            ? `Yours, for signing in. At least ${PASSWORD_MIN_LENGTH} characters.`
            : `At least ${PASSWORD_MIN_LENGTH} characters.`
        }
      />
      <FormError message={serverError} />
      <div className="flex flex-col gap-3">
        <NtButton type="submit" size="lg" busy={busy} className="self-start">
          {teenPath
            ? busy
              ? 'Sending'
              : 'Send my parent the link'
            : busy
              ? 'Creating your account'
              : 'Create account'}
        </NtButton>
        <p className="nt-small">
          {teenPath ? 'Your parent agrees to the ' : 'By creating an account you agree to the '}
          <Link href={PRODUCT_ROUTES.legalTerms} className="underline underline-offset-4">
            terms
          </Link>{' '}
          and the{' '}
          <Link href={PRODUCT_ROUTES.legalPrivacy} className="underline underline-offset-4">
            privacy policy
          </Link>
          {teenPath ? ' when they finish setting up the account' : ''}. Already have an account?{' '}
          <Link href={PRODUCT_ROUTES.signIn} className="underline underline-offset-4">
            Sign in
          </Link>
          .
        </p>
      </div>
    </form>
  );
}
