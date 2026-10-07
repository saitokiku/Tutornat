// Browser Supabase client. Returns null when env isn't configured —
// the app then runs in local demo mode (localStorage only, no accounts).
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabase = url && anon ? createClient(url, anon) : null;
export const cloudConfigured = Boolean(supabase);

export async function getAccessToken() {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data?.session?.access_token || null;
}

// fetch() that carries the user's JWT so API routes can authenticate + meter
export async function authedFetch(path, opts = {}) {
  const token = await getAccessToken();
  return fetch(path, {
    ...opts,
    headers: {
      ...(opts.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
}
