'use client';

// /forgot-password — request a reset email via Supabase.

import { useState } from 'react';
import Link from 'next/link';
import { supabase, cloudConfigured } from '@/lib/supabaseClient';
import { KaizenMark } from '@/components/Brand';
import Button from '@/components/ui/Button';
import Field from '@/components/ui/Field';
import Notice from '@/components/ui/Notice';
import { IconArrowLeft, IconCheck } from '@/components/Icons';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  async function submit(e) {
    e.preventDefault();
    setError('');
    if (!cloudConfigured) {
      setError('Accounts are not configured on this deployment. The demo has no passwords.');
      return;
    }
    if (!email.trim()) { setError('Enter your email.'); return; }
    setBusy(true);
    try {
      const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (err) throw err;
      setSent(true);
    } catch (err) {
      setError(err.message || 'Could not send the reset email.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-paper flex items-center justify-center px-5 py-12">
      <div className="w-full max-w-narrow">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-5"><KaizenMark size={44} /></div>
          <h1 className="font-brand text-t1 font-semibold text-ink">Reset your password</h1>
          <p className="text-muted text-sm mt-1.5">We&apos;ll email you a link to set a new one.</p>
        </div>

        {sent ? (
          <div className="k-card p-6 sm:p-7 text-center space-y-3">
            <div className="flex justify-center text-good"><IconCheck size={30} /></div>
            <p className="text-t3 text-ink font-semibold">Check your email</p>
            <p className="text-sm text-muted">
              If an account exists for <span className="font-medium text-ink">{email.trim()}</span>,
              a reset link is on its way. It expires in about an hour.
            </p>
            <Link href="/dashboard" className="inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-accent hover:text-ink transition-colors pt-1">
              <IconArrowLeft size={14} />
              Back to sign in
            </Link>
          </div>
        ) : (
          <form onSubmit={submit} className="k-card p-6 sm:p-7 space-y-4">
            <Field
              label="Email"
              type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              autoComplete="email" autoFocus
            />
            <Button type="submit" variant="primary" size="lg" block disabled={busy}>
              {busy ? 'Sending…' : 'Email me a reset link'}
            </Button>
            {error && <Notice kind="bad">{error}</Notice>}
            <Link href="/dashboard" className="flex items-center justify-center gap-1.5 text-xs text-muted hover:text-ink transition-colors pt-1">
              <IconArrowLeft size={14} />
              Back to sign in
            </Link>
          </form>
        )}
      </div>
    </div>
  );
}
