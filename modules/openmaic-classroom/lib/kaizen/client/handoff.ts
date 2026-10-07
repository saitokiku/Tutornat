/**
 * Where a generation came from, and where it must go back to.
 *
 * `/generation-preview` is shared: upstream's homepage and the Kaizen surface
 * both hand off to it through `sessionStorage.generationSession`. Its three
 * exits used to be hardcoded to the upstream surface, so a learner who started
 * inside `/kaizen` was deposited outside the rail (F1).
 *
 * The marker here is deliberately **not** a return URL. It stores a fixed
 * origin token plus the session id it belongs to; the destinations are literal
 * route constants in this file. A tampered or stale marker can therefore only
 * ever select between two known in-app routes — there is no value from storage
 * that can become a redirect target.
 *
 * Staleness: the marker is bound to one `sessionId` and is consumed (read and
 * deleted) by whichever exit fires. A marker left behind by an abandoned flow
 * cannot capture a later upstream generation, because that generation carries a
 * different session id.
 */

const ORIGIN_KEY = 'kaizen.generationOrigin';
const ORIGIN_TOKEN = 'kaizen';

/** Fixed destinations. Never built from stored data. */
const ROUTES = {
  kaizenHome: '/kaizen',
  kaizenStage: (id: string) => `/kaizen/course/${id}`,
  upstreamHome: '/',
  upstreamStage: (id: string) => `/classroom/${id}`,
} as const;

interface OriginMarker {
  readonly origin: typeof ORIGIN_TOKEN;
  readonly sessionId: string;
}

function session(): Storage | null {
  try {
    return typeof sessionStorage === 'undefined' ? null : sessionStorage;
  } catch {
    // Node, or a browser refusing storage access.
    return null;
  }
}

/** Called by Kaizen right after it writes `generationSession`. */
export function markKaizenOrigin(sessionId: string): void {
  const marker: OriginMarker = { origin: ORIGIN_TOKEN, sessionId };
  session()?.setItem(ORIGIN_KEY, JSON.stringify(marker));
}

export function clearKaizenOrigin(): void {
  session()?.removeItem(ORIGIN_KEY);
}

function readMarker(): OriginMarker | null {
  const raw = session()?.getItem(ORIGIN_KEY);
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      (parsed as OriginMarker).origin === ORIGIN_TOKEN &&
      typeof (parsed as OriginMarker).sessionId === 'string'
    ) {
      return parsed as OriginMarker;
    }
  } catch {
    /* unreadable marker is simply no marker */
  }
  return null;
}

/**
 * Is this generation the Kaizen surface's?
 *
 * `sessionId` omitted/null means "no live session to bind to" (the
 * session-not-found screen): any valid marker counts, since there is no flow
 * left for it to be stale against.
 */
export function isKaizenOrigin(sessionId?: string | null): boolean {
  const marker = readMarker();
  if (!marker) return false;
  return sessionId == null || marker.sessionId === sessionId;
}

/**
 * The route a `/generation-preview` exit should take, consuming the marker.
 *
 * Default (no marker, or a marker for a different session) is exactly today's
 * upstream behavior.
 */
export function takeGenerationExit(
  kind: 'stage' | 'home',
  opts: { readonly stageId?: string; readonly sessionId?: string | null } = {},
): string {
  const mine = isKaizenOrigin(opts.sessionId);
  // Consumed on the way out: completion, cancel and error all land here, so the
  // marker never survives the flow it belongs to.
  clearKaizenOrigin();
  if (kind === 'home') return mine ? ROUTES.kaizenHome : ROUTES.upstreamHome;
  if (!opts.stageId) return mine ? ROUTES.kaizenHome : ROUTES.upstreamHome;
  return mine ? ROUTES.kaizenStage(opts.stageId) : ROUTES.upstreamStage(opts.stageId);
}
