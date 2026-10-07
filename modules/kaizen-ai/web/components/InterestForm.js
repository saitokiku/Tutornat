'use client';
// First-pick capture for the held storefront. Posts to /api/club/interest.
// Full state cycle: idle -> busy -> done, with the failure rendered inline
// under the field and never as a toast, because the form is the context and a
// refusal that floats away is a refusal the visitor never reads. The hidden
// "company" field is the honeypot the API swallows silently.
//
// Layout is Field + Button, not a hand-typed input: `inline` only decides
// whether the button sits beside the field or under it. The failure line lives
// outside that row so an error can never shove the button out of alignment.
//
// The submit rule, product-wide: **a submit is always live and validates on
// press.** This form is where that rule comes from (it ships on /, /pricing,
// /schedule, /tutors and /ai), and /contact was brought onto it rather than the
// other way round, so the same pill in the same situation now means the same
// thing on every page. The empty required field is not a reason to withhold the
// action: `required` on the Field refuses the press and names the reason in the
// field itself, with no JS and no state to keep in sync. `disabled` is reserved
// for one meaning, in flight, where ui/Button renders it as the quiet
// panel2/muted pair (4.9:1) rather than a fade nobody can read.
import { useId, useState } from 'react';
import Button from '@/components/ui/Button';
import Field from '@/components/ui/Field';

// Field ships day-skinned (k-input: white panel, ink text). The one dark
// surface re-skins it here with night tokens rather than forking the
// primitive, which is what produced two drifting input recipes last time.
// The border is deliberately NOT in here: two border-color utilities on the
// same element are decided by stylesheet order, not by intent, and nightline
// would quietly outrank the failure border. It is chosen once, below.
const NIGHT_FIELD = [
  '[&_label]:text-paper',
  '[&_input]:bg-coal [&_input]:text-paper',
  '[&_input]:placeholder:text-nightmuted',
  '[&_input]:focus:border-ember [&_input]:focus:ring-ember/25',
].join(' ');

export default function InterestForm({
  kind = null,
  source = '/',
  buttonLabel = 'Get first pick',
  inline = false,
  tone = 'day',
  className = '',
}) {
  const [status, setStatus] = useState('idle'); // idle | busy | done | error
  const [error, setError] = useState('');
  // Instance-unique id: several capture forms can share a page (hero +
  // per-section), and duplicate DOM ids break the error association.
  const instanceId = useId();
  const errorId = `${instanceId}-err`;
  const night = tone === 'night';
  const failed = status === 'error';
  // One border decision, in priority order: a failure marks the field on both
  // tones; otherwise night re-skins it and day keeps k-input's hairline.
  const fieldBorder = failed
    ? '[&_input]:border-bad'
    : night ? '[&_input]:border-nightline' : '';

  async function submit(e) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setStatus('busy');
    setError('');
    try {
      const res = await fetch('/api/club/interest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: form.get('email'),
          company: form.get('company'),
          kind,
          source,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'That didn’t save. Check the address and try again.');
      setStatus('done');
    } catch (err) {
      setStatus('error');
      setError(err.message);
    }
  }

  if (status === 'done') {
    return (
      <p className={`text-sm font-medium ${night ? 'text-ember' : 'text-good'} ${className}`}>
        You&apos;re on the list. We&apos;ll email you the day this opens.
      </p>
    );
  }

  return (
    <form onSubmit={submit} className={className}>
      <div className={inline ? 'flex flex-col gap-3 sm:flex-row sm:items-end' : 'flex flex-col gap-3'}>
        <Field
          label="Email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="you@example.com"
          aria-invalid={failed ? 'true' : undefined}
          aria-describedby={failed ? errorId : undefined}
          className={[
            inline ? 'sm:flex-1' : '',
            night ? NIGHT_FIELD : '',
            fieldBorder,
          ].filter(Boolean).join(' ')}
        />
        {/* Honeypot: humans never see it, bots fill it, the API swallows it. */}
        <input
          name="company"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
          className="hidden"
        />
        <Button
          type="submit"
          tone={tone}
          disabled={status === 'busy'}
          block={!inline}
          className={inline ? 'shrink-0' : ''}
        >
          {status === 'busy' ? 'Saving' : buttonLabel}
        </Button>
      </div>
      <p className={`mt-2 text-xs ${night ? 'text-nightmuted' : 'text-muted'}`}>
        One email when this opens. Nothing else.
      </p>
      {/* The error channel. On coal the `bad` token drops to 3.4:1, so the
          night failure reads in paper against the bad-bordered field rather
          than in a red no one can make out. Never the success channel. */}
      {failed && (
        <p id={errorId} role="alert" className={`mt-2 text-sm ${night ? 'text-paper' : 'text-bad'}`}>
          {error}
        </p>
      )}
    </form>
  );
}
