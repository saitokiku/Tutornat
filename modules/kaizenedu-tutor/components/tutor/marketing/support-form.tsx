'use client';

import { useRef, useState, type FormEvent } from 'react';
import Link from 'next/link';

import { tutorApi, validateEmail } from '@/lib/tutor/client';
import { PRODUCT_ROUTES } from '@/lib/tutor/contracts';
import { SUPPORT_MESSAGE_MAX, SUPPORT_MESSAGE_MIN } from '@/lib/tutor/support/limits';
import type { SupportResponse } from '@/lib/tutor/wire';

import { NtButton } from '@/components/tutor/ui/button';
import { TextAreaField, TextField } from '@/components/tutor/ui/fields';
import { FormError } from '@/components/tutor/ui/form-error';

function validateMessage(value: string): string | undefined {
  const trimmed = value.trim();
  if (trimmed.length < SUPPORT_MESSAGE_MIN) {
    return `Say a little more: at least ${SUPPORT_MESSAGE_MIN} characters.`;
  }
  if (trimmed.length > SUPPORT_MESSAGE_MAX) {
    return `Keep it under ${SUPPORT_MESSAGE_MAX.toLocaleString()} characters.`;
  }
  return undefined;
}

/** The page the visitor came from, when it was one of ours; sent along so support knows where they were. */
function referrerPath(): string | undefined {
  try {
    const referrer = document.referrer ? new URL(document.referrer) : null;
    if (referrer && referrer.origin === window.location.origin) return referrer.pathname;
  } catch {
    // A malformed referrer is nobody's problem.
  }
  return undefined;
}

/**
 * One message to a person. The answer is one of: sent (with a reference), saved
 * but not delivered (said plainly, with the reference), or an error with the
 * form left in place for a retry.
 */
export function SupportForm() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [errors, setErrors] = useState<{ email?: string; message?: string }>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [outcome, setOutcome] = useState<SupportResponse | null>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const messageRef = useRef<HTMLTextAreaElement>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const next = {
      email: validateEmail(email) ?? undefined,
      message: validateMessage(message),
    };
    setErrors(next);
    setServerError(null);
    if (next.email) {
      emailRef.current?.focus();
      return;
    }
    if (next.message) {
      messageRef.current?.focus();
      return;
    }
    setBusy(true);
    const page = referrerPath();
    const result = await tutorApi.sendSupportRequest({
      email: email.trim(),
      message: message.trim(),
      ...(page ? { page } : {}),
    });
    setBusy(false);
    if (!result.ok) {
      setServerError(result.message);
      return;
    }
    setOutcome(result.data);
  }

  if (outcome) {
    return (
      <div className="nt-panel flex flex-col gap-3 p-6" role="status">
        <h2 className="nt-h3">{outcome.delivered ? 'Sent' : 'Saved, but not delivered'}</h2>
        <p className="nt-body">{outcome.message}</p>
        <p className="nt-small text-muted-foreground">
          Reference <code className="font-mono">{outcome.reference}</code>.
        </p>
        <p className="nt-small">
          <Link href={PRODUCT_ROUTES.landing} className="underline underline-offset-4">
            Back to the start
          </Link>
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-5">
      <TextField
        ref={emailRef}
        id="support-email"
        label="Your email"
        hint="Where the reply goes."
        type="email"
        autoComplete="email"
        inputMode="email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        error={errors.email}
      />
      <TextAreaField
        ref={messageRef}
        id="support-message"
        label="What happened, or what you need"
        hint={`Between ${SUPPORT_MESSAGE_MIN} and ${SUPPORT_MESSAGE_MAX.toLocaleString()} characters. Leave passwords out.`}
        value={message}
        onChange={(event) => setMessage(event.target.value)}
        error={errors.message}
        rows={6}
      />
      <FormError message={serverError} />
      <NtButton type="submit" size="lg" busy={busy} className="self-start">
        {busy ? 'Sending' : 'Send to a person'}
      </NtButton>
    </form>
  );
}
