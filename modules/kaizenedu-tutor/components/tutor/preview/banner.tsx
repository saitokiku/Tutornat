import { isPreviewMode } from '@/lib/tutor/preview';

/**
 * The banner every preview screen carries. It is not decoration: preview
 * screens render invented sample data, and a viewer who mistook it for a real
 * learner's record would be misled about a child's progress. So the banner is
 * always visible, never dismissible, and says plainly that nothing is saved.
 *
 * Renders nothing once DATABASE_URL is set, because the mode is derived from
 * that and the screens are showing real rows from that moment on.
 */
export function PreviewBanner() {
  if (!isPreviewMode()) return null;
  return (
    <div
      role="status"
      className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 border-b border-amber-300/60 bg-amber-50 px-4 py-2 text-center text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-950/40 dark:text-amber-100"
    >
      <span className="font-medium">Preview</span>
      <span className="opacity-90">
        Sample data for an invented learner. Nothing is saved and no session is real.
      </span>
      <span className="opacity-75">Set DATABASE_URL to run for real.</span>
    </div>
  );
}
