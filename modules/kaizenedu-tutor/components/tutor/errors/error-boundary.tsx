'use client';

/**
 * Recoverable error boundary for product screens (CLAUDE.md: every screen
 * ships an error state). On a render error it shows a plain state with a
 * reference code, moves focus to it, and posts `{ code, route, sessionId }`
 * to /api/tutor/error-report: the error's name only, no message and no stack,
 * so nothing a learner typed can leave the browser through this path.
 */
import { Component, type ReactNode } from 'react';

export const ERROR_REPORT_PATH = '/api/tutor/error-report';

export interface ErrorReportBody {
  code: string;
  route: string;
  sessionId?: string;
}

/** The error's class name, restricted to a short safe alphabet. */
export function errorCodeFor(error: unknown): string {
  const name = error instanceof Error && error.name ? error.name : 'Error';
  return name.replace(/[^A-Za-z0-9_.-]/g, '').slice(0, 64) || 'Error';
}

export async function postErrorReport(
  body: ErrorReportBody,
  fetchImpl: typeof fetch = fetch,
): Promise<boolean> {
  try {
    const response = await fetchImpl(ERROR_REPORT_PATH, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
      keepalive: true,
    });
    return response.ok;
  } catch {
    return false;
  }
}

export interface TutorErrorBoundaryProps {
  children: ReactNode;
  /** Session the screen belongs to, for the report's ids. */
  sessionId?: string;
  /** Runs after "Try again" so the parent can clear its own state. */
  onReset?: () => void;
  /** Custom recovery UI; receives the reset callback and the reference code. */
  fallback?: (input: { reset: () => void; code: string }) => ReactNode;
}

interface TutorErrorBoundaryState {
  failed: boolean;
  code: string;
}

export class TutorErrorBoundary extends Component<
  TutorErrorBoundaryProps,
  TutorErrorBoundaryState
> {
  state: TutorErrorBoundaryState = { failed: false, code: 'Error' };

  private heading: HTMLHeadingElement | null = null;

  static getDerivedStateFromError(error: unknown): TutorErrorBoundaryState {
    return { failed: true, code: errorCodeFor(error) };
  }

  componentDidCatch(error: unknown): void {
    const route = typeof window === 'undefined' ? '/' : window.location.pathname;
    void postErrorReport({
      code: errorCodeFor(error),
      route,
      ...(this.props.sessionId ? { sessionId: this.props.sessionId } : {}),
    });
  }

  componentDidUpdate(_prev: TutorErrorBoundaryProps, prevState: TutorErrorBoundaryState): void {
    if (this.state.failed && !prevState.failed) this.heading?.focus();
  }

  reset = (): void => {
    this.setState({ failed: false, code: 'Error' });
    this.props.onReset?.();
  };

  reload = (): void => {
    if (typeof window !== 'undefined') window.location.reload();
  };

  render(): ReactNode {
    if (!this.state.failed) return this.props.children;
    if (this.props.fallback)
      return this.props.fallback({ reset: this.reset, code: this.state.code });
    const offline = typeof navigator !== 'undefined' && navigator.onLine === false;
    return (
      <section
        role="alert"
        aria-live="assertive"
        className="mx-auto max-w-md rounded-lg border border-border bg-background p-6 text-foreground"
      >
        <h2
          ref={(element) => {
            this.heading = element;
          }}
          tabIndex={-1}
          className="text-lg font-semibold outline-none"
        >
          This part of the page stopped working.
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {offline
            ? 'You look offline. Reconnect, then try again. Your session is kept on the server.'
            : 'Your session is kept on the server. A reference was sent to us without any of your content.'}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">Reference: {this.state.code}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={this.reset}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            Try again
          </button>
          <button
            type="button"
            onClick={this.reload}
            className="rounded-md border border-border px-4 py-2 text-sm font-medium"
          >
            Reload the page
          </button>
        </div>
      </section>
    );
  }
}
