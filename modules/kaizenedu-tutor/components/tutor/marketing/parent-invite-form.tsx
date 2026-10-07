'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import {
  auth,
  bandLabel,
  firstErrorKey,
  hasErrors,
  PASSWORD_MIN_LENGTH,
  signInUrlFor,
  validateDisplayName,
  validateLoginName,
  validatePassword,
  type FieldErrors,
} from '@/lib/tutor/client';
import { PRODUCT_ROUTES } from '@/lib/tutor/contracts';
import type { ParentInviteResponse } from '@/lib/tutor/wire';

import { SignOutButton } from '@/components/tutor/shell/sign-out-button';
import { LoadingState } from '@/components/tutor/shell/states';
import { NtButton } from '@/components/tutor/ui/button';
import { TextField } from '@/components/tutor/ui/fields';
import { FormError } from '@/components/tutor/ui/form-error';

type Field = 'displayName' | 'password' | 'loginName';
type Status = 'loading' | 'ready' | 'invalid' | 'error';

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="nt-panel flex flex-col gap-3 p-6" role="status">
      <h2 className="nt-h3">{title}</h2>
      {children}
    </div>
  );
}

/**
 * The parent's half of a teen-started sign-up (D30). Reads the invitation
 * from the link, then one of: create the account around the profile, attach
 * the profile to the signed-in account, sign in first because the address
 * already has an account, or the dead-link state.
 */
export function ParentInviteForm({
  token,
  signedInEmail,
}: {
  token: string | null;
  signedInEmail: string | null;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<Status>(token ? 'loading' : 'invalid');
  const [invite, setInvite] = useState<ParentInviteResponse | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [loginName, setLoginName] = useState('');
  const [needLoginName, setNeedLoginName] = useState(false);
  const [errors, setErrors] = useState<FieldErrors<Field>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const loginRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    void auth.parentInvite(token).then((result) => {
      if (cancelled) return;
      if (result.ok) {
        setInvite(result.data);
        setStatus('ready');
      } else if (result.code === 'INVALID_TOKEN') {
        setStatus('invalid');
      } else {
        setLoadError(result.message);
        setStatus('error');
      }
    });
    return () => {
      cancelled = true;
    };
  }, [token]);

  if (status === 'loading') return <LoadingState label="Opening the invitation" />;

  if (status === 'invalid' || !token) {
    return (
      <Panel title="This link has expired or was already used">
        <p className="nt-body">
          An invitation works once, for seven days. Ask your teen to start again from the sign-up
          page; the new link comes to the same address.
        </p>
        <p className="nt-small">
          <Link href={PRODUCT_ROUTES.signIn} className="underline underline-offset-4">
            Sign in
          </Link>
        </p>
      </Panel>
    );
  }

  if (status === 'error' || !invite) {
    return (
      <div className="flex flex-col gap-4">
        <FormError message={loadError ?? 'The invitation could not be opened.'} />
        <NtButton type="button" size="md" onClick={() => router.refresh()} className="self-start">
          Try again
        </NtButton>
      </div>
    );
  }

  const mine = signedInEmail !== null && signedInEmail.trim().toLowerCase() === invite.parentEmail;
  const summary = (
    <p className="nt-body">
      <strong>{invite.teen.displayName}</strong>, {bandLabel(invite.teen.band).toLowerCase()}, will
      sign in with the login name <strong>{invite.teen.loginName}</strong>. You see what they work
      on and how it is going; they never get email from us.
    </p>
  );

  if (signedInEmail !== null && !mine) {
    return (
      <Panel title="This invitation was sent to a different address">
        <p className="nt-body">
          It was sent to {invite.parentEmail}. Sign out, then open the link again from that account,
          or create it if it does not exist yet.
        </p>
        <SignOutButton className="self-start" />
      </Panel>
    );
  }

  if (invite.existingAccount && signedInEmail === null) {
    return (
      <Panel title="Sign in to add the profile">
        {summary}
        <p className="nt-body">
          An account with {invite.parentEmail} already exists. Sign in and you come straight back
          here.
        </p>
        <p className="nt-small">
          <Link
            href={signInUrlFor(PRODUCT_ROUTES.parentInvite, `?t=${encodeURIComponent(token)}`)}
            className="underline underline-offset-4"
          >
            Sign in
          </Link>
        </p>
      </Panel>
    );
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !token) return;
    const next: FieldErrors<Field> = {
      displayName: mine ? undefined : (validateDisplayName(displayName, 'your name') ?? undefined),
      password: mine ? undefined : (validatePassword(password) ?? undefined),
      loginName: needLoginName ? (validateLoginName(loginName) ?? undefined) : undefined,
    };
    setErrors(next);
    setServerError(null);
    if (hasErrors(next)) {
      const key = firstErrorKey(next, ['displayName', 'password', 'loginName']);
      (key === 'displayName'
        ? nameRef
        : key === 'password'
          ? passwordRef
          : loginRef
      ).current?.focus();
      return;
    }
    setBusy(true);
    const result = await auth.acceptParentInvite({
      token,
      ...(mine ? {} : { displayName: displayName.trim(), password }),
      ...(needLoginName ? { loginName: loginName.trim() } : {}),
    });
    if (!result.ok) {
      setBusy(false);
      if (result.code === 'INVALID_TOKEN') setStatus('invalid');
      else if (result.code === 'LOGIN_NAME_TAKEN') {
        setNeedLoginName(true);
        setErrors({ loginName: result.message });
        setTimeout(() => loginRef.current?.focus(), 0);
      } else setServerError(result.message);
      return;
    }
    router.push(PRODUCT_ROUTES.parent);
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-5">
      {summary}
      {mine ? null : (
        <>
          <p className="nt-small">
            The account is yours, at {invite.parentEmail}. Nothing exists until you save.
          </p>
          <TextField
            ref={nameRef}
            id="invite-name"
            label="Your name"
            autoComplete="name"
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            error={errors.displayName}
            hint="What the dashboard calls you."
          />
          <TextField
            ref={passwordRef}
            id="invite-password"
            label="Password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            error={errors.password}
            hint={`At least ${PASSWORD_MIN_LENGTH} characters.`}
          />
        </>
      )}
      {needLoginName ? (
        <TextField
          ref={loginRef}
          id="invite-login"
          label="A new login name for them"
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          value={loginName}
          onChange={(event) => setLoginName(event.target.value)}
          error={errors.loginName}
          hint="The name they chose was taken in the meantime. Tell them the new one."
        />
      ) : null}
      <FormError message={serverError} />
      <NtButton type="submit" size="lg" busy={busy} className="self-start">
        {busy ? 'Saving' : mine ? 'Add the profile' : 'Create the account'}
      </NtButton>
      {mine ? null : (
        <p className="nt-small">
          By creating the account you agree to the{' '}
          <Link href={PRODUCT_ROUTES.legalTerms} className="underline underline-offset-4">
            terms
          </Link>{' '}
          and the{' '}
          <Link href={PRODUCT_ROUTES.legalPrivacy} className="underline underline-offset-4">
            privacy policy
          </Link>
          .
        </p>
      )}
    </form>
  );
}
