'use client';

// /reset-password — landing page for the Supabase recovery link. The link
// carries a recovery session; once it's detected, the user sets a new password.

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase, cloudConfigured } from '@/lib/supabaseClient';
import { KaizenMark } from '@/components/Brand';
import Button from '@/components/ui/Button';
import Field from '@/components/ui/Field';
import Notice from '@/components/ui/Notice';
import { IconArrowLeft, IconArrowRight, IconCheck } from '@/components/Icons';

export default function ResetPassword() {
  const [ready, setReady] = useState(false);      // recovery session detected
  const [checking, setChecking] = useState(true);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!cloudConfigured) { setChecking(false); return; }
    let cancelled = false;
    // The recovery link signs the user in with a special session. It may take
    // a beat for supabase-js to parse the URL hash — listen and also check.
    const sub = supabase.auth.onAuthStateChange((event, session) => {
      if (cancelled) return;
      if (event === 'PASSWORD_RECOVERY' || (event === 'SIGNED_IN' && session)) {
        setReady(true); setChecking(false);
      }
    });
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!cancelled && data?.session) { setReady(true); }
      // give the hash parse a moment before declaring the link dead
      setTimeout(() => { if (!cancelled) setChecking(false); }, 1500);
    })();
    return () => { cancelled = true; sub.data.subscription.unsubscribe(); };
  }, []);

  async function submit(e) {
    e.preventDefault();
    setError('');
    if (password.length < 8) { setError('Password needs at least 8 characters.'); return; }
    if (password !== confirm) { setError("Those passwords don't match."); return; }
    setBusy(true);
    try {
      const { error: err } = await supabase.auth.updateUser({ password });
      if (err) throw err;
      setDone(true);
      setTimeout(() => { window.location.href = '/dashboard'; }, 1500);
    } catch (err) {
      setError(err.message || 'Could not update the password.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-paper flex items-center justify-center px-5 py-12">
      <div className="w-full max-w-narrow">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-5"><KaizenMark size={44} /></div>
          <h1 className="font-brand text-t1 font-semibold text-ink">Set a new password</h1>
        </div>

        {!cloudConfigured ? (
          <Card>
            <p className="text-sm text-muted text-center">
              Accounts are not configured on this deployment. Nothing to reset.
            </p>
            <BackLink />
          </Card>
        ) : done ? (
          <Card>
            <div className="text-center space-y-2">
              <div className="flex justify-center text-good"><IconCheck size={30} /></div>
              <p className="text-t3 font-semibold text-ink">Password updated</p>
              <p className="text-sm text-muted">Taking you to your dashboard…</p>
            </div>
          </Card>
        ) : checking ? (
          <Card>
            <div className="flex items-center justify-center gap-3 py-2">
              <span className="w-5 h-5 rounded-full border-2 border-accent border-t-transparent animate-spin" />
              <span className="text-sm text-muted">Checking your reset link…</span>
            </div>
          </Card>
        ) : !ready ? (
          <Card>
            <p className="text-sm text-muted text-center">
              This reset link is invalid or has expired.
            </p>
            <Link href="/forgot-password" className="flex items-center justify-center gap-1.5 text-xs font-semibold text-accent hover:text-ink transition-colors pt-2">
              Request a new link
              <IconArrowRight size={14} />
            </Link>
          </Card>
        ) : (
          <form onSubmit={submit} className="k-card p-6 sm:p-7 space-y-4">
            <Field
              label="New password"
              hint="At least 8 characters."
              type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password" autoFocus
            />
            <Field
              label="Repeat new password"
              type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
            />
            <Button type="submit" variant="primary" size="lg" block disabled={busy}>
              {busy ? 'Saving…' : 'Save new password'}
            </Button>
            {error && <Notice kind="bad">{error}</Notice>}
          </form>
        )}
      </div>
    </div>
  );
}

// The five render states above all sit on one card recipe, so a dead link and a
// saved password are the same shape at the same width.
function Card({ children }) {
  return <div className="k-card p-6 sm:p-7 space-y-3">{children}</div>;
}
function BackLink() {
  return (
    <Link href="/dashboard" className="flex items-center justify-center gap-1.5 text-xs font-semibold text-accent hover:text-ink transition-colors pt-2">
      <IconArrowLeft size={14} />
      Back to the app
    </Link>
  );
}
