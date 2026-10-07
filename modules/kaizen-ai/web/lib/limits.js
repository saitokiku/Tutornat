// 429 → upgrade interceptor. Wraps authedFetch; when any AI route answers
// 429 (daily plan cap or burst limit), dispatches a global event so the app
// shell can surface a friendly "upgrade to keep going" prompt instead of a
// raw error. The response is still returned for local handling.

import { authedFetch } from '@/lib/supabaseClient';

export const LIMIT_EVENT = 'kaizen:limit';

export async function limitedFetch(path, opts = {}) {
  const res = await authedFetch(path, opts);
  if (res.status === 429) {
    let message = '';
    try { message = (await res.clone().json())?.error || ''; } catch {
      try { message = await res.clone().text(); } catch { /* noop */ }
    }
    try {
      window.dispatchEvent(new CustomEvent(LIMIT_EVENT, { detail: { path, message } }));
    } catch { /* SSR / non-browser: noop */ }
  }
  return res;
}

export function onLimit(handler) {
  if (typeof window === 'undefined') return () => {};
  const fn = (e) => handler(e.detail || {});
  window.addEventListener(LIMIT_EVENT, fn);
  return () => window.removeEventListener(LIMIT_EVENT, fn);
}
