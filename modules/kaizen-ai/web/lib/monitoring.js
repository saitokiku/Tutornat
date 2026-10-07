// Error monitoring — minimal Sentry-compatible reporter, DSN-gated, no SDK.
// Sends a bare exception envelope to Sentry's store endpoint when
// NEXT_PUBLIC_SENTRY_DSN is set; otherwise a silent no-op. Full
// @sentry/nextjs (source maps, traces, breadcrumbs) is a fast-follow —
// this keeps launch-week crashes visible without new build machinery.

// Server code can use a private SENTRY_DSN; the client uses the public one.
const DSN = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;

function parseDsn(dsn) {
  try {
    const u = new URL(dsn);
    const projectId = u.pathname.replace(/^\//, '');
    if (!u.username || !projectId) return null;
    return { endpoint: `${u.protocol}//${u.host}/api/${projectId}/store/?sentry_key=${u.username}&sentry_version=7` };
  } catch {
    return null;
  }
}

const target = DSN ? parseDsn(DSN) : null;

export function captureException(error, context = {}) {
  const isServer = typeof window === 'undefined';
  // Always surface server-side errors to the logs so a failed charge, booking,
  // or consent email is never invisible in production (audit: API routes had
  // zero error reporting — monitoring used to no-op entirely on the server).
  if (isServer) {
    try { console.error('[captureException]', error?.message || error, context); } catch { /* noop */ }
  }
  if (!target) return;
  try {
    const url = isServer ? String(context.url || 'server') : window.location.href;
    fetch(target.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        platform: 'javascript',
        timestamp: Date.now() / 1000,
        exception: {
          values: [{
            type: error?.name || 'Error',
            value: String(error?.message || error || 'unknown').slice(0, 500),
            stacktrace: error?.stack
              ? { frames: [{ filename: 'raw', function: String(error.stack).slice(0, 2000) }] }
              : undefined,
          }],
        },
        tags: { app: 'kaizen-web', side: isServer ? 'server' : 'client' },
        extra: context,
        request: { url },
      }),
      keepalive: true,
    }).catch(() => {});
  } catch { /* monitoring must never break the app */ }
}
