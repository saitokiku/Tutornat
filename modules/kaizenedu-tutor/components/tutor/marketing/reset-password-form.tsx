'use client';

import { useRef, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import {
  auth,
  firstErrorKey,
  hasErrors,
  PASSWORD_MIN_LENGTH,
  validatePassword,
  type FieldErrors,
} from '@/lib/tutor/client';
import { homeForRole } from '@/lib/tutor/client/navigation';
import { PRODUCT_ROUTES } from '@/lib/tutor/contracts';

import { NtButton } from '@/components/tutor/ui/button';
import { TextField } from '@/components/tutor/ui/fields';
import { FormError } from '@/components/tutor/ui/form-error';

type Field = 'password' | 'confirm';

/** The one state a dead link gets: no error code, one thing to do. */
function InvalidLink() {
  return (
    <div className="nt-panel flex flex-col gap-3 p-6" role="status">
      <h2 className="nt-h3">This link has expired or was already used</h2>
      <p className="nt-body">A reset link works once, for one hour. Request another one.</p>
      <p className="nt-small">
        <Link href={PRODUCT_ROUTES.forgotPassword} className="underline underline-offset-4">
          Request a new link
        </Link>
      </p>
    </div>
  );
}

/**
 * Two password fields and the token from the emailed link. A refused token
 * becomes the dead-link state; any other refusal shows inline; success signs
 * the account in and goes home.
 */
export function ResetPasswordForm({ token }: { token: string | null }) {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<FieldErrors<Field>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [invalid, setInvalid] = useState(!token);
  const passwordRef = useRef<HTMLInputElement>(null);
  const confirmRef = useRef<HTMLInputElement>(null);

  if (invalid || !token) return <InvalidLink />;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !token) return;
    const check: FieldErrors<Field> = {
      password: validatePassword(password) ?? undefined,
      confirm: confirm === password ? undefined : 'The two passwords do not match.',
    };
    setErrors(check);
    setServerError(null);
    if (hasErrors(check)) {
      const key = firstErrorKey(check, ['password', 'confirm']);
      (key === 'password' ? passwordRef : confirmRef).current?.focus();
      return;
    }
    setBusy(true);
    const result = await auth.resetPassword({ token, password });
    if (!result.ok) {
      setBusy(false);
      if (result.code === 'INVALID_TOKEN') setInvalid(true);
      else setServerError(result.message);
      return;
    }
    router.push(homeForRole(result.data.principal.role));
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-5">
      <TextField
        ref={passwordRef}
        id="reset-password"
        label="New password"
        type="password"
        autoComplete="new-password"
        hint={`At least ${PASSWORD_MIN_LENGTH} characters.`}
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        error={errors.password}
      />
      <TextField
        ref={confirmRef}
        id="reset-confirm"
        label="New password, again"
        type="password"
        autoComplete="new-password"
        value={confirm}
        onChange={(event) => setConfirm(event.target.value)}
        error={errors.confirm}
      />
      <FormError message={serverError} />
      <NtButton type="submit" size="lg" busy={busy} className="self-start">
        {busy ? 'Saving' : 'Save and sign in'}
      </NtButton>
      <p className="nt-small">
        Every other device signed in to this account is signed out when you save.
      </p>
    </form>
  );
}
