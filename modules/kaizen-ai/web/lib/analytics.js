// Product analytics — PostHog, key-gated, dependency-free.
// Without NEXT_PUBLIC_POSTHOG_KEY every call is a silent no-op (never a crash).
// Events tracked: signup, intake_used, tutor_message, grade, upgrade_clicked,
// checkout_completed.

const KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const HOST = (process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com').replace(/\/$/, '');
const ID_KEY = 'kaizen.analytics.id';

function distinctId() {
  try {
    let id = window.localStorage.getItem(ID_KEY);
    if (!id) {
      id = crypto?.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2);
      window.localStorage.setItem(ID_KEY, id);
    }
    return id;
  } catch {
    return 'anon';
  }
}

// User opt-out (Settings → Privacy preferences) silences everything.
function optedOut() {
  try { return window.localStorage.getItem('kaizen.analytics.optout') === '1'; } catch { return false; }
}

// One POST path to the PostHog capture endpoint. Analytics must never break the
// app, so every failure is swallowed.
function post(body) {
  try {
    fetch(`${HOST}/capture/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ api_key: KEY, timestamp: new Date().toISOString(), ...body }),
      keepalive: true,
    }).catch(() => {});
  } catch { /* noop */ }
}

// Tie the anonymous id to the signed-in user (call after auth). The stored id
// is a one-way SHA-256 of the user id (audit DATA-003) — analytics stays
// joinable across sessions without shipping the raw account id to PostHog.
//
// The switch of distinct_id is not enough on its own: PostHog treats the old
// anonymous id and the new hashed id as two different people, so every event
// from before sign-in (landing, the signup funnel itself) is stranded on a
// profile that never joins the known user. It must send an $identify event that
// names the previous anonymous id, which is what merges the two. Without it the
// onboarding and week-1-return funnels are broken at exactly the signup step.
export function identify(userId) {
  if (!KEY || typeof window === 'undefined' || !userId || optedOut()) return;
  if (!crypto?.subtle?.digest) return;
  try {
    crypto.subtle.digest('SHA-256', new TextEncoder().encode(String(userId)))
      .then((buf) => {
        const hex = [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
        const newId = `h_${hex.slice(0, 32)}`;
        let prevId = null;
        try { prevId = window.localStorage.getItem(ID_KEY); } catch { /* noop */ }
        try { window.localStorage.setItem(ID_KEY, newId); } catch { /* noop */ }
        // Only the first identify on a device has an anon id to merge; once the
        // stored id is already the hash, this is a no-op and sends nothing.
        if (prevId && prevId !== newId) {
          post({ event: '$identify', distinct_id: newId, properties: { $anon_distinct_id: prevId } });
        }
      })
      .catch(() => {});
  } catch { /* noop */ }
}

export function capture(event, properties = {}) {
  if (!KEY || typeof window === 'undefined' || optedOut()) return;
  post({
    event,
    distinct_id: distinctId(),
    properties: { ...properties, $current_url: window.location.href },
  });
}
