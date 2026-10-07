import { Skeleton } from '@/components/tutor/shell/states';

/**
 * The loading state for the session route. It is the call layout with the
 * three panes blocked out, so the screen does not jump when the real one
 * arrives (CLAUDE.md: every screen ships loading, empty, error, offline).
 */
export default function SessionLoading() {
  return (
    <div className="nt-session" role="status" aria-live="polite">
      <span className="sr-only">Opening the session</span>
      <div className="nt-session-head">
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-5 w-20" />
      </div>
      <div className="nt-session-body">
        <div className="nt-tile nt-tutor">
          <div className="nt-tile-bar">
            <Skeleton className="h-5 w-20" />
          </div>
          <div className="nt-tutor-stage">
            <Skeleton className="aspect-square w-40 rounded-full" />
          </div>
        </div>
        <div className="nt-tile nt-board">
          <div className="nt-tile-bar">
            <Skeleton className="h-5 w-24" />
          </div>
          <div className="nt-board-sheet" />
        </div>
        <div className="nt-rail">
          <div className="nt-tile nt-transcript-tile">
            <div className="nt-tile-bar">
              <Skeleton className="h-5 w-24" />
            </div>
            <div className="nt-transcript">
              <Skeleton className="h-5 w-5/6" />
              <Skeleton className="h-5 w-2/3" />
            </div>
          </div>
          <div className="nt-dock">
            <Skeleton className="h-11 w-full" />
            <Skeleton className="h-11 w-full" />
          </div>
        </div>
      </div>
    </div>
  );
}
