import { Suspense } from 'react';
import { notFound } from 'next/navigation';

import { isTutorMode } from '@/kaizen.config';

import { AvatarPreview } from '@/components/tutor/avatar/preview';

/**
 * Dev-only contact sheet for what the tutor is on screen
 * (`components/tutor/avatar`).
 *
 * It exists for two reasons. The rigs are imperative SVG driven at frame rate,
 * so the only way to judge one is to see every state, expression, gaze and
 * level at once; and there are now three of them — the abstract presence, the
 * SVG character, and the Rive seam — which only a side-by-side settles. It is
 * not a product screen, so it is gated twice: TUTOR_MODE, like every product
 * path, and a hard refusal in a production build.
 */
export const dynamic = 'force-dynamic';

export const metadata = { title: 'Tutor presence', robots: { index: false, follow: false } };

export default function AvatarPreviewPage() {
  if (!isTutorMode() || process.env.NODE_ENV === 'production') notFound();
  return (
    <Suspense fallback={<p className="nt-small">Loading the rigs</p>}>
      <AvatarPreview />
    </Suspense>
  );
}
