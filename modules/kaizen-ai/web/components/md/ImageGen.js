'use client';

// Renders an ```image fence. Generation is expensive and lowest-priority, so it
// is CLICK-to-generate (never automatic) — this also stops restored chats from
// re-generating on every mount. Degrades to a clear "not enabled" chip when
// GEMINI_API_KEY is unset (the API returns 501).
//
// The offer reads as a labelled slot rather than an emoji: a mono IMAGE tag,
// the prompt, and the ink pill that does the work. Not-enabled keeps its own
// quiet row, because "this server can't do that" is a state the product owns
// rather than a failure to apologise for.

import { useState } from 'react';
import { authedFetch } from '@/lib/supabaseClient';
import Button from '@/components/ui/Button';

export default function ImageGen({ prompt }) {
  const [state, setState] = useState({ idle: true });

  async function generate() {
    setState({ loading: true });
    try {
      const res = await authedFetch('/api/image', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 501) setState({ disabled: true });
      else if (!res.ok) setState({ error: data.error || 'Could not generate.' });
      else setState({ url: data.dataUrl });
    } catch {
      setState({ error: 'Could not generate.' });
    }
  }

  if (state.url) {
    return (
      <figure className="my-3">
        <img src={state.url} alt={prompt} className="rounded-md border border-border max-w-full w-full" />
        <figcaption className="text-xs text-muted mt-2">{prompt}</figcaption>
      </figure>
    );
  }
  if (state.disabled) {
    return (
      <div className="my-3 flex items-center gap-3 rounded-sm border border-border bg-panel2 px-3 py-2.5">
        <span className="shrink-0 rounded-sm border border-border bg-panel px-1.5 py-1 font-opmono text-micro text-muted">IMAGE</span>
        <span className="text-xs text-muted">Image generation isn’t enabled on this server.</span>
      </div>
    );
  }
  return (
    <div className={`my-3 flex items-center gap-3 rounded-sm border bg-panel2 px-3 py-2.5 ${state.error ? 'border-bad/40' : 'border-border'}`}>
      <span className="shrink-0 rounded-sm border border-border bg-panel px-1.5 py-1 font-opmono text-micro text-muted">IMAGE</span>
      {/* The prompt stays put through a failure: the row's tone and the Retry
          label carry the bad news, and nothing about a failure renders in a
          success color. */}
      <span className="flex-1 min-w-0 truncate text-xs text-ink">{prompt}</span>
      <Button type="button" size="sm" onClick={generate} disabled={state.loading} className="shrink-0">
        {state.loading ? 'Generating…' : state.error ? 'Retry' : 'Generate image'}
      </Button>
    </div>
  );
}
