'use client';

import { useState, useEffect } from 'react';
import { supabase, cloudConfigured } from '@/lib/supabaseClient';
import { capture, identify } from '@/lib/analytics';
import { KaizenMark } from '@/components/Brand';
import Button from '@/components/ui/Button';
import Field from '@/components/ui/Field';
import Notice from '@/components/ui/Notice';
import HeldState from '@/components/ui/HeldState';
import AppFooter from '@/components/ui/AppFooter';

// Real accounts only. Successful sign-in/up flows through Supabase's
// onAuthStateChange listener in the dashboard — no local/demo fallback.
// When Supabase isn't configured, the form says so plainly instead of faking it.

// Do two addresses reach the same inbox? Plus-tags fold, because sam+mom@x.com
// and sam@x.com are one mailbox wherever subaddressing exists. A deliberate
// copy of lib/server/context.js's mailboxKey rather than an import: that module
// is the service-role tree and must never reach the browser. The server copy is
// the authority; this one only decides whether to show a message before submit.
function sameMailbox(a, b) {
  const fold = (v) => {
    const s = String(v || '').trim().toLowerCase();
    const at = s.lastIndexOf('@');
    if (at <= 0) return s;
    const local = s.slice(0, at);
    return `${local.split('+')[0] || local}@${s.slice(at + 1)}`;
  };
  const x = fold(a), y = fold(b);
  return Boolean(x) && x === y;
}

export default function LoginPage() {
  const [mode, setMode] = useState('signin'); // signin | signup
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [needsConfirm, setNeedsConfirm] = useState(''); // email awaiting verification
  const [resent, setResent] = useState(false);
  const [birthYear, setBirthYear] = useState('');
  const [under13, setUnder13] = useState(false);
  const [guardianEmail, setGuardianEmail] = useState('');
  const [signupsEnabled, setSignupsEnabled] = useState(true);

  const age = birthYear ? new Date().getFullYear() - Number(birthYear) : null;
  const isMinorSignup = age !== null && age >= 13 && age < 18;

  // Admin kill switch (app_settings is public-read). UI-level guard: closes
  // the door politely; the switch is an ops control, not a security boundary.
  useEffect(() => {
    if (!cloudConfigured) return;
    supabase.from('app_settings').select('value').eq('key', 'signups_enabled').maybeSingle()
      .then(({ data }) => { if (data && data.value === false) setSignupsEnabled(false); })
      .catch(() => {});
  }, []);

  async function submit(e) {
    e.preventDefault();
    setError(''); setNote(''); setNeedsConfirm(''); setResent(false);
    if (!cloudConfigured) {
      // Product voice, never an engineering task and never a vendor's name: the
      // same sentence ui/HeldState puts above the form, so the reader who
      // reaches this guard by keyboard hears exactly what they already read.
      setNote('Accounts open when the club opens. Nothing is lost in the meantime.');
      return;
    }
    if (!email.trim() || password.length < 8) {
      setError('Enter your email and a password of at least 8 characters.');
      return;
    }
    if (mode === 'signup' && !signupsEnabled) {
      setError('New sign-ups are paused right now. Check back soon.');
      return;
    }
    if (mode === 'signup') {
      if (!birthYear) { setError('Pick your birth year.'); return; }
      if (new Date().getFullYear() - Number(birthYear) < 13) {
        setUnder13(true);
        fetch('/api/safety/under13', { method: 'POST' }).catch(() => {});
        return;
      }
      if (isMinorSignup) {
        const g = guardianEmail.trim().toLowerCase();
        if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(g)) {
          setError('Add a parent or guardian email so we can let them know you joined.');
          return;
        }
        // THIS CHECK IS UX, NOT SECURITY. The form holds the anon key, so a
        // signup can be posted straight at Supabase with this file never
        // running; the rule that counts is re-derived server-side in
        // lib/server/context.js (guardianEmailIsSelf) at profile creation,
        // where a self-named address stores no guardian email at all. Catching
        // it here just spares an honest signup the trip through /settings.
        // Kept in step with the server on plus-tags for the same reason — the
        // two must not disagree about what "different" means.
        if (sameMailbox(g, email)) {
          setError('The guardian email must be different from your own.');
          return;
        }
      }
    }
    setBusy(true);
    try {
      if (mode === 'signup') {
        const { data, error: err } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              birth_year: Number(birthYear),
              ...(isMinorSignup ? { guardian_email: guardianEmail.trim().toLowerCase() } : {}),
            },
          },
        });
        if (err) throw err;
        if (data.user?.id) identify(data.user.id);
        capture('signup', { confirmed: Boolean(data.session) });
        // A live session (email confirmation disabled) is picked up by the
        // dashboard's onAuthStateChange listener automatically.
        if (!data.session) {
          setNeedsConfirm(email.trim());
          setNote('Check your email to confirm your account, then sign in.');
        }
      } else {
        const { error: err } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (err) {
          if (/confirm/i.test(err.message || '')) setNeedsConfirm(email.trim());
          throw err;
        }
        // Success → onAuthStateChange (SIGNED_IN) enters the app.
      }
    } catch (err) {
      setError(err.message || 'Authentication failed.');
    } finally {
      setBusy(false);
    }
  }

  async function resendConfirmation() {
    if (!needsConfirm || resent) return;
    try {
      // supabase-js returns {error} rather than throwing — check it explicitly
      const { error: err } = await supabase.auth.resend({ type: 'signup', email: needsConfirm });
      if (err) throw err;
      setResent(true);
      setNote(`Confirmation email re-sent to ${needsConfirm}.`);
    } catch (err) {
      setError(err.message || 'Could not resend the email.');
    }
  }

  return (
    <div className="min-h-screen bg-paper flex flex-col">
      {/* One container for the whole page: this body sits on the same wide rail
          the footer uses, so the mark, the h1 and the copyright line share one
          left edge — the same edge /settings, /billing and /family now hold.
          The form keeps its own measure INSIDE that rail, and the column stays
          centered in the height it has. */}
      <div className="flex-1 flex items-center py-12">
        <div className="w-full max-w-wide mx-auto px-5">
          <div className="max-w-narrow">

            <div className="mb-8">
              <div className="mb-5"><KaizenMark size={52} /></div>
              {/* One title size for the whole interior: /settings, /billing and
                  /family carry the same pair, so the heading no longer shrinks
                  as a parent walks from the marketing pages into the app. */}
              <h1 className="font-brand text-d3 sm:text-d2 font-semibold text-ink">Kaizen</h1>
              <p className="text-muted text-sm mt-2">
                A calm, intelligent study companion.<br />Small steps, every day.
              </p>
            </div>

            {/* The one held-state message, in the one place every interior page
                puts it: under the title, above the surface it governs. This is
                the screen a parent lands on from "Open Kaizen" in the marketing
                header, so it never names a vendor and never hands them a
                configuration task. */}
            {!cloudConfigured && <HeldState kind="accounts" className="mb-4" />}

            <form onSubmit={submit} className="k-card p-6 sm:p-7 space-y-4">
              {/* The form is held as one thing. Holding only the pill left a
                  live-looking segmented control and two live-looking fields
                  above a dead button: a person could type an email and a
                  password and only then learn that nothing was listening.
                  Disabled here is the Button's own doctrine, not a dimming —
                  the controls drop to the quiet surface and keep their shape. */}
              <div className="grid grid-cols-2 gap-1 bg-panel2 border border-border rounded-full p-1">
                {['signin', 'signup'].map((m) => (
                  <button key={m} type="button" onClick={() => { setMode(m); setError(''); }}
                    disabled={!cloudConfigured}
                    className={`py-2 rounded-full text-xs font-semibold transition-colors active:scale-[0.98] disabled:text-muted disabled:pointer-events-none ${mode === m ? 'bg-panel text-ink shadow-soft' : 'text-muted hover:text-ink'}`}>
                    {m === 'signin' ? 'Sign in' : 'Create account'}
                  </button>
                ))}
              </div>

              <Field
                label="Email"
                type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                disabled={!cloudConfigured}
                controlClassName="disabled:bg-panel2 disabled:text-muted"
              />
              <Field
                label="Password"
                hint={mode === 'signup' ? 'At least 8 characters.' : null}
                type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                disabled={!cloudConfigured}
                controlClassName="disabled:bg-panel2 disabled:text-muted"
              />
              {mode === 'signup' && (
                // Wrapping label rather than htmlFor: Field's children slot cannot
                // carry <option>s, and adding a DOM id here would be a new id.
                <label className="flex flex-col gap-1.5">
                  <span className="text-sm font-medium text-ink">Birth year</span>
                  <select
                    value={birthYear}
                    onChange={(e) => { setBirthYear(e.target.value); setUnder13(false); }}
                    disabled={!cloudConfigured}
                    className="k-input font-opmono tabular-nums appearance-none disabled:bg-panel2 disabled:text-muted"
                  >
                    <option value="">Birth year</option>
                    {Array.from({ length: 80 }, (_, i) => new Date().getFullYear() - 5 - i).map((y) => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </label>
              )}
              {mode === 'signup' && isMinorSignup && (
                <Field
                  label="Parent or guardian email"
                  hint={
                    <>
                      Because you&apos;re under 18, we&apos;ll email your parent/guardian that you
                      joined. The AI study tools work right away;{' '}
                      <b className="font-semibold text-ink">live video tutoring unlocks once they approve</b>.
                    </>
                  }
                  type="email" value={guardianEmail} onChange={(e) => setGuardianEmail(e.target.value)}
                  disabled={!cloudConfigured}
                  controlClassName="disabled:bg-panel2 disabled:text-muted"
                />
              )}
              {under13 && (
                <Notice kind="warn">
                  <span className="font-semibold">Kaizen currently serves students ages 13 and up.</span>{' '}
                  Support for younger students is coming. A parent or guardian can
                  email <a href="mailto:hello@kaizenedu.net" className="text-accent underline underline-offset-2">hello@kaizenedu.net</a>{' '}
                  and we&apos;ll let you know the moment it&apos;s ready.
                </Notice>
              )}

              {/* An action that cannot work must not look like one that can. The
                  enabled ink pill above an "accounts aren't available" line
                  invited a click with nothing behind it; while sign-in genuinely
                  cannot run, the pill renders disabled. */}
              <Button type="submit" variant="primary" size="lg" block disabled={busy || !cloudConfigured}>
                {busy ? 'One sec…' : mode === 'signin' ? 'Sign in' : 'Create account'}
              </Button>

              {/* The reason stays next to the held control. The page banner
                  says it once for the page; a dead button needs it in reach of
                  the thumb that just pressed it. */}
              {!cloudConfigured && (
                <p className="text-xs text-muted text-center">
                  Sign-in opens when the club opens.
                </p>
              )}

              {/* A refusal never renders in the success channel: errors are the bad
                  Notice (role=alert), confirmations and courtesy notes are info. */}
              {error && <Notice kind="bad">{error}</Notice>}
              {note && <Notice kind="info">{note}</Notice>}
              {needsConfirm && !resent && (
                <button type="button" onClick={resendConfirmation}
                  className="w-full text-xs font-semibold text-accent text-center hover:text-ink transition-colors">
                  Didn&apos;t get it? Resend the confirmation email
                </button>
              )}
              {cloudConfigured && mode === 'signin' && (
                <a href="/forgot-password" className="block text-xs text-muted text-center hover:text-accent transition-colors">
                  Forgot password?
                </a>
              )}
              {mode === 'signup' && (
                <p className="text-xs text-muted text-center">
                  Parent? Create your own account here, then add your teens and book their
                  sessions from the <a href="/family" className="text-accent underline underline-offset-2">family page</a>.
                </p>
              )}
            </form>

            <p className="text-xs text-muted mt-6">
              By continuing you agree to the <a href="/terms" className="underline underline-offset-2 hover:text-ink transition-colors">Terms</a> &amp; <a href="/privacy" className="underline underline-offset-2 hover:text-ink transition-colors">Privacy Policy</a>.<br />
              Kaizen is for learning, not cheating. See our <a href="/academic-integrity" className="underline underline-offset-2 hover:text-ink transition-colors">integrity policy</a>.
            </p>
          </div>
        </div>
      </div>
      <AppFooter />
    </div>
  );
}
