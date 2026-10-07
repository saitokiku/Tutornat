'use client';

import { useRef, useState, type FormEvent } from 'react';
import Link from 'next/link';

import { auth, validateEmail } from '@/lib/tutor/client';
import { PRODUCT_ROUTES } from '@/lib/tutor/contracts';
import type { RequestPasswordResetResponse } from '@/lib/tutor/wire';

import { NtButton } from '@/components/tutor/ui/button';
import { TextField } from '@/components/tutor/ui/fields';
import { FormError } from '@/components/tutor/ui/form-error';

/**
 * Asks for the address and shows one of three answers: the email is on its
 * way (said the same way whether or not the address is known), this deploy
 * cannot send email, or the send failed and the form stays for a retry.
 */
export function ForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [serverError, setServerError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [outcome, setOutcome] = useState<RequestPasswordResetResponse | null>(null);
  const emailRef = useRef<HTMLInputElement>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const check = validateEmail(email) ?? undefined;
    setError(check);
    setServerError(null);
    if (check) {
      emailRef.current?.focus();
      return;
    }
    setBusy(true);
    const result = await auth.requestPasswordReset({ email: email.trim() });
    setBusy(false);
    if (!result.ok) {
      setServerError(result.message);
      return;
    }
    if (result.data.delivery === 'failed') {
      setServerError(result.data.message);
      return;
    }
    setOutcome(result.data);
  }

  if (outcome?.delivery === 'sent') {
    return (
      <div className="nt-panel flex flex-col gap-3 p-6" role="status">
        <h2 className="nt-h3">Check your email</h2>
        <p className="nt-body">{outcome.message}</p>
        <p className="nt-small text-muted-foreground">
          Nothing after a few minutes? Look in spam, or{' '}
          <button
            type="button"
            className="underline underline-offset-4"
            onClick={() => setOutcome(null)}
          >
            try another address
          </button>
          .
        </p>
        <p className="nt-small">
          <Link href={PRODUCT_ROUTES.signIn} className="underline underline-offset-4">
            Back to sign in
          </Link>
        </p>
      </div>
    );
  }

  if (outcome?.delivery === 'not_configured') {
    return (
      <div className="nt-panel flex flex-col gap-3 p-6" role="status">
        <h2 className="nt-h3">Email is not set up on this deployment</h2>
        <p className="nt-body">{outcome.message}</p>
        <p className="nt-small">
          <Link href={PRODUCT_ROUTES.signIn} className="underline underline-offset-4">
            Back to sign in
          </Link>
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-5">
      <TextField
        ref={emailRef}
        id="forgot-email"
        label="Email"
        type="email"
        autoComplete="email"
        inputMode="email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        error={error}
      />
      <FormError message={serverError} />
      <NtButton type="submit" size="lg" busy={busy} className="self-start">
        {busy ? 'Sending' : 'Send the link'}
      </NtButton>
      <p className="nt-small">
        Remembered it?{' '}
        <Link href={PRODUCT_ROUTES.signIn} className="underline underline-offset-4">
          Sign in
        </Link>
        .
      </p>
    </form>
  );
}
