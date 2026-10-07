// Outbound fetch of a URL a USER supplied. SERVER ONLY.
//
// WHY THIS EXISTS
// Phase 2 connectors (ICS calendar subscription, and anything else where a
// student pastes a link) will make the server fetch an arbitrary URL. A plain
// fetch() there is a server-side request forgery hole: the server sits inside a
// trusted network and will happily retrieve
//   http://169.254.169.254/…        cloud instance metadata / credentials
//   http://127.0.0.1:54321/…        the local Supabase / admin surface
//   http://10.x, 192.168.x, 172.16  anything else reachable internally
//   file:///etc/passwd              non-HTTP schemes
// and hand the body back to the person who supplied the link.
//
// This module is the only sanctioned way to fetch a user-supplied URL. It is
// written BEFORE the first connector on purpose: retrofitting it after a
// connector ships means the vulnerable path exists in between.
//
// WHAT IT DOES NOT DO. It cannot fully close DNS rebinding — the name is
// resolved for validation and then again by fetch(), and a hostile resolver can
// answer differently the second time. Fully closing that needs pinning the
// validated IP and dialling it directly with a custom agent. For fetching a
// student's calendar feed the residual risk is small and the checks below remove
// every trivial vector; a connector handling higher-value data should pin.

import dns from 'node:dns/promises';
import net from 'node:net';

const ALLOWED_PROTOCOLS = new Set(['http:', 'https:']);
const DEFAULT_MAX_BYTES = 5 * 1024 * 1024; // 5MB — a calendar feed, not a disk image
const DEFAULT_TIMEOUT_MS = 10_000;

/** Is this address inside a range that should never be reachable from user input? */
export function isBlockedAddress(ip) {
  if (!ip) return true;
  const v = net.isIP(ip);
  if (v === 4) {
    const p = ip.split('.').map(Number);
    if (p.length !== 4 || p.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return true;
    const [a, b] = p;
    if (a === 0) return true;                              // "this network"
    if (a === 10) return true;                             // private
    if (a === 127) return true;                            // loopback
    if (a === 169 && b === 254) return true;               // link-local + cloud metadata
    if (a === 172 && b >= 16 && b <= 31) return true;      // private
    if (a === 192 && b === 168) return true;               // private
    if (a === 100 && b >= 64 && b <= 127) return true;     // CGNAT
    if (a === 192 && b === 0) return true;                 // protocol assignments
    if (a >= 224) return true;                             // multicast + reserved
    return false;
  }
  if (v === 6) {
    const s = ip.toLowerCase().replace(/^\[|\]$/g, '');
    if (s === '::1' || s === '::') return true;            // loopback / unspecified
    if (s.startsWith('fe80')) return true;                 // link-local
    if (s.startsWith('fc') || s.startsWith('fd')) return true; // unique-local
    if (s.startsWith('ff')) return true;                   // multicast
    // IPv4-mapped (::ffff:a.b.c.d) must be judged on the embedded v4 address.
    const m = s.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (m) return isBlockedAddress(m[1]);
    return false;
  }
  return true; // not an IP literal → caller must resolve first
}

/**
 * Validate a user-supplied URL: scheme allowlist, no credentials, and every
 * resolved address outside the blocked ranges. PURE except for the DNS lookup.
 *
 * @returns {Promise<{ok: true, url: URL, addresses: string[]} | {ok: false, reason: string}>}
 */
export async function assertSafeUrl(raw) {
  let url;
  try { url = new URL(String(raw)); } catch { return { ok: false, reason: 'not a valid URL' }; }

  if (!ALLOWED_PROTOCOLS.has(url.protocol)) {
    return { ok: false, reason: `scheme ${url.protocol} is not allowed (http/https only)` };
  }
  // user:pass@host can smuggle credentials to an internal service.
  if (url.username || url.password) return { ok: false, reason: 'credentials in URL are not allowed' };

  const host = url.hostname.replace(/^\[|\]$/g, '');

  // An IP literal is judged directly; a name is resolved and EVERY answer must
  // be safe (a hostile name can return one public and one private address).
  if (net.isIP(host)) {
    if (isBlockedAddress(host)) return { ok: false, reason: 'address is in a blocked range' };
    return { ok: true, url, addresses: [host] };
  }

  let addresses;
  try {
    const records = await dns.lookup(host, { all: true });
    addresses = records.map((r) => r.address);
  } catch {
    return { ok: false, reason: 'host could not be resolved' };
  }
  if (!addresses.length) return { ok: false, reason: 'host resolved to no addresses' };
  for (const a of addresses) {
    if (isBlockedAddress(a)) return { ok: false, reason: 'host resolves into a blocked range' };
  }
  return { ok: true, url, addresses };
}

/**
 * Fetch a user-supplied URL with SSRF, size and time limits.
 *
 * Redirects are NOT followed automatically — a permitted public URL can redirect
 * straight to 169.254.169.254, so each hop is re-validated by this function.
 *
 * @returns {Promise<{ok: true, status: number, body: string, contentType: string}
 *                 | {ok: false, reason: string}>}
 */
export async function safeFetch(raw, {
  maxBytes = DEFAULT_MAX_BYTES,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  maxRedirects = 3,
  accept = null,
} = {}) {
  let target = raw;

  for (let hop = 0; hop <= maxRedirects; hop++) {
    const check = await assertSafeUrl(target);
    if (check.ok !== true) {
      return { ok: false, reason: /** @type {any} */ (check).reason || 'rejected' };
    }

    let res;
    try {
      res = await fetch(check.url.toString(), {
        redirect: 'manual', // every hop is re-validated above, never blindly followed
        signal: AbortSignal.timeout(timeoutMs),
        headers: accept ? { Accept: accept } : undefined,
      });
    } catch (e) {
      return { ok: false, reason: e?.name === 'TimeoutError' ? 'request timed out' : 'request failed' };
    }

    if ([301, 302, 303, 307, 308].includes(res.status)) {
      const loc = res.headers.get('location');
      if (!loc) return { ok: false, reason: 'redirect without a location' };
      target = new URL(loc, check.url).toString(); // re-validated on the next pass
      continue;
    }

    if (!res.ok) return { ok: false, reason: `upstream returned ${res.status}` };

    // Declared length is a fast reject; the stream is still capped below, because
    // Content-Length can lie or be absent.
    const declared = Number(res.headers.get('content-length') || 0);
    if (declared && declared > maxBytes) return { ok: false, reason: 'response too large' };

    const reader = res.body?.getReader();
    if (!reader) return { ok: false, reason: 'empty response body' };
    const chunks = [];
    let total = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.length;
      if (total > maxBytes) {
        try { await reader.cancel(); } catch { /* noop */ }
        return { ok: false, reason: 'response too large' };
      }
      chunks.push(value);
    }
    const buf = new Uint8Array(total);
    let off = 0;
    for (const c of chunks) { buf.set(c, off); off += c.length; }

    return {
      ok: true,
      status: res.status,
      body: new TextDecoder().decode(buf),
      contentType: res.headers.get('content-type') || '',
    };
  }
  return { ok: false, reason: 'too many redirects' };
}
