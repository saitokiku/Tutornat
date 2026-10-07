'use client';

// Route-level error boundary — friendly copy, no stack traces to users.
//
// Standalone by design (the boundary can catch a failure before any shell has
// rendered), so it paints its own paper surface. Everything else comes from the
// system: Card for the one raised panel, Button for the retry, an icon for the
// way back instead of a typed arrow glyph.

import { KaizenMark } from '@/components/Brand';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import { IconArrowLeft } from '@/components/Icons';
import { captureException } from '@/lib/monitoring';

export default function Error({ error, reset }) {
  // Log for developers/monitoring; render nothing scary to the student.
  if (typeof console !== 'undefined') console.error('[kaizen] route error:', error);
  captureException(error, { boundary: 'route' });

  return (
    <div className="min-h-screen bg-paper flex items-center justify-center px-5 py-16">
      <div className="w-full max-w-narrow text-center">
        <Card pad="lg">
          <KaizenMark size={44} className="mx-auto" />
          <h1 className="mt-6 font-brand font-semibold text-t1 text-ink">Something hiccuped</h1>
          <p className="mt-3 text-body text-muted">
            Your work is saved. Give it another try. If it keeps happening, we&apos;d love to hear
            about it.
          </p>
          <Button onClick={() => reset()} block className="mt-7">Try again</Button>
        </Card>
        <a
          href="/dashboard"
          className="mt-5 inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-ink"
        >
          <IconArrowLeft size={16} />
          Back to my dashboard
        </a>
      </div>
    </div>
  );
}
