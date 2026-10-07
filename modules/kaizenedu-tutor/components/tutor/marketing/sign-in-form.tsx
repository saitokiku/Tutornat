'use client';

import { useRef, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import {
  auth,
  firstErrorKey,
  hasErrors,
  validateEmail,
  validateLoginName,
  type FieldErrors,
} from '@/lib/tutor/client';
import { homeForRole } from '@/lib/tutor/client/navigation';
import { PRODUCT_ROUTES } from '@/lib/tutor/contracts';

import { NtButton } from '@/components/tutor/ui/button';
import { TextField } from '@/components/tutor/ui/fields';
import { FormError } from '@/components/tutor/ui/form-error';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

type AccountField = 'email' | 'password';
type TeenField = 'loginName' | 'password';

function required(value: string, message: string): string | undefined {
  return value ? undefined : message;
}

/** Account holders sign in with email; teens with the login name their parent set (spec R5). */
export function SignInForm({ next }: { next: string | null }) {
  return (
    <Tabs defaultValue="account" className="gap-6">
      <TabsList variant="line" className="w-full justify-start border-b border-border">
        <TabsTrigger value="account" className="nt-target">
          Account
        </TabsTrigger>
        <TabsTrigger value="teen" className="nt-target">
          Teen sign-in
        </TabsTrigger>
      </TabsList>
      <TabsContent value="account">
        <AccountSignIn next={next} />
      </TabsContent>
      <TabsContent value="teen">
        <TeenSignIn next={next} />
      </TabsContent>
    </Tabs>
  );
}

function AccountSignIn({ next }: { next: string | null }) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<FieldErrors<AccountField>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const check: FieldErrors<AccountField> = {
      email: validateEmail(email) ?? undefined,
      password: required(password, 'Enter your password.'),
    };
    setErrors(check);
    setServerError(null);
    if (hasErrors(check)) {
      const key = firstErrorKey(check, ['email', 'password']);
      (key === 'email' ? emailRef : passwordRef).current?.focus();
      return;
    }
    setBusy(true);
    const result = await auth.signIn({ email: email.trim(), password });
    if (!result.ok) {
      setBusy(false);
      setServerError(result.message);
      return;
    }
    router.push(next ?? homeForRole(result.data.principal.role));
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-5">
      <TextField
        ref={emailRef}
        id="signin-email"
        label="Email"
        type="email"
        autoComplete="email"
        inputMode="email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        error={errors.email}
      />
      <TextField
        ref={passwordRef}
        id="signin-password"
        label="Password"
        type="password"
        autoComplete="current-password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        error={errors.password}
      />
      <p className="nt-small -mt-3">
        <Link href={PRODUCT_ROUTES.forgotPassword} className="underline underline-offset-4">
          Forgot your password?
        </Link>
      </p>
      <FormError message={serverError} />
      <NtButton type="submit" size="lg" busy={busy} className="self-start">
        {busy ? 'Signing in' : 'Sign in'}
      </NtButton>
      <p className="nt-small">
        New here?{' '}
        <Link href={PRODUCT_ROUTES.signUp} className="underline underline-offset-4">
          Create an account
        </Link>
        . Free for 30 minutes, no card.
      </p>
    </form>
  );
}

function TeenSignIn({ next }: { next: string | null }) {
  const router = useRouter();
  const [loginName, setLoginName] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<FieldErrors<TeenField>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const loginRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const check: FieldErrors<TeenField> = {
      loginName: validateLoginName(loginName) ?? undefined,
      password: required(password, 'Enter your password.'),
    };
    setErrors(check);
    setServerError(null);
    if (hasErrors(check)) {
      const key = firstErrorKey(check, ['loginName', 'password']);
      (key === 'loginName' ? loginRef : passwordRef).current?.focus();
      return;
    }
    setBusy(true);
    const result = await auth.teenSignIn({ loginName: loginName.trim(), password });
    if (!result.ok) {
      setBusy(false);
      setServerError(result.message);
      return;
    }
    router.push(next ?? PRODUCT_ROUTES.learn);
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-5">
      <p className="nt-small">
        Your login name is the one your parent set when they added your profile, or the one you
        chose when you signed up. It is not an email.
      </p>
      <TextField
        ref={loginRef}
        id="teen-login"
        label="Login name"
        autoComplete="username"
        autoCapitalize="none"
        spellCheck={false}
        value={loginName}
        onChange={(event) => setLoginName(event.target.value)}
        error={errors.loginName}
      />
      <TextField
        ref={passwordRef}
        id="teen-password"
        label="Password"
        type="password"
        autoComplete="current-password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        error={errors.password}
      />
      <FormError message={serverError} />
      <NtButton type="submit" size="lg" busy={busy} className="self-start">
        {busy ? 'Signing in' : 'Sign in'}
      </NtButton>
    </form>
  );
}
