import { NextRequest, NextResponse } from 'next/server';

import { isAgentRuntimeConfigured, isProWorkbenchEnabled } from '@/lib/config/feature-flags';
// KAIZEN: product route gate reads the server-only flag from kaizen.config.ts.
import {
  isProductPath,
  isServedInTutorMode,
  isTutorMode,
  isTutorModePublic,
} from '@/kaizen.config';

/**
 * Upstream routes the product replaces with authenticated equivalents. Each
 * accepts provider credentials in its body and has no session check of its own.
 */
const SUPERSEDED_UPSTREAM_ROUTES = new Set([
  '/api/transcription',
  '/api/generate/tts',
  '/api/parse-pdf',
  '/api/extract-document',
]);

/** Convert string to Uint8Array */
function encode(str: string): Uint8Array {
  return new TextEncoder().encode(str);
}

/** Convert ArrayBuffer to hex string */
function bufToHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/** Verify an HMAC-signed token using Web Crypto API (Edge-compatible) */
async function verifyToken(token: string, accessCode: string): Promise<boolean> {
  const dotIndex = token.indexOf('.');
  if (dotIndex === -1) return false;

  const timestamp = token.substring(0, dotIndex);
  const signature = token.substring(dotIndex + 1);

  const keyData = encode(accessCode);
  const key = await crypto.subtle.importKey(
    'raw',
    keyData.buffer as ArrayBuffer,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );

  const data = encode(timestamp);
  const expected = bufToHex(await crypto.subtle.sign('HMAC', key, data.buffer as ArrayBuffer));

  // Constant-length comparison (not truly constant-time in JS, but sufficient here)
  if (signature.length !== expected.length) return false;
  let mismatch = 0;
  for (let i = 0; i < signature.length; i++) {
    mismatch |= signature.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return mismatch === 0;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Return an actual server-side 404 when either half of the workbench is off.
  // Edge middleware cannot reliably inspect server-only deployment variables,
  // so it enforces the public gate and leaves the complete runtime/database
  // check to Node. A Node-hosted middleware uses the same gate as startup.
  const canInspectServerRuntime = process.env.NEXT_RUNTIME !== 'edge';
  const workbenchEnabled =
    isProWorkbenchEnabled() && (!canInspectServerRuntime || isAgentRuntimeConfigured());
  if (!workbenchEnabled && (pathname === '/workbench' || pathname.startsWith('/workbench/'))) {
    return new NextResponse('Not found', { status: 404 });
  }

  // KAIZEN: product routes (spec §8.2; CLAUDE.md "TUTOR_MODE=1 gates every
  // product path") answer a real 404 unless the server-only TUTOR_MODE flag is
  // on, mirroring the workbench gate above. Product layouts and route handlers
  // check isTutorMode() again, so this is the first fence, not the only one.
  // The edge bundle only sees env values inlined at build time, and the
  // public flag is inlined everywhere; the server-only flag is re-checked in
  // every product layout and route handler, which is the real gate.
  const tutorOn = isTutorMode() || isTutorModePublic();
  if (!tutorOn && isProductPath(pathname)) {
    return new NextResponse('Not found', { status: 404 });
  }
  // KAIZEN: strip passes 1 and 2 (docs/MVP-REFERENCE.md §6, the strip list) as
  // one fence instead of deletions, so the weekly upstream merge stays clean.
  // With the product on, upstream's home, classroom, workspace, workbench,
  // previews, and every /api/* route outside the product's own are not served
  // at all; isServedInTutorMode (kaizen.config.ts) names what stays.
  if (tutorOn && !isServedInTutorMode(pathname)) {
    return new NextResponse('Not found', { status: 404 });
  }
  // KAIZEN: upstream ships media and document routes that take a provider key
  // and base URL from the REQUEST BODY and require no session at all. The
  // header strip below cannot reach a form field, and none of these sit under
  // a product prefix, so with the product on they stayed open: anyone could
  // post a child's audio and have the server forward it to an endpoint of
  // their choosing, or simply spend our provider key. The product has its own
  // authenticated equivalents (/api/tutor/asr, /api/tutor/tts,
  // /api/tutor/problem-extract), so upstream's versions are closed here rather
  // than left mounted. With the product off, upstream keeps them. The fence
  // above closes them too; the list stays as the record of why they closed
  // first (D23) and as the check the invariant suite pins.
  if (tutorOn && SUPERSEDED_UPSTREAM_ROUTES.has(pathname)) {
    return new NextResponse('Not found', { status: 404 });
  }

  // KAIZEN: with the product on, the root is the product landing page, not
  // upstream's course generator. A rewrite keeps the URL at "/".
  if (tutorOn && pathname === '/') {
    return NextResponse.rewrite(new URL('/welcome', request.url));
  }

  // KAIZEN: provider lock-down (spec R8). With the product on, no request may
  // steer a route to a client-supplied model, key, or base URL; the server's
  // routing and keys are the only ones. The headers are dropped here so every
  // upstream route that still reads them sees nothing.
  if (tutorOn && pathname.startsWith('/api/')) {
    const stripped = new Headers(request.headers);
    let changed = false;
    for (const name of ['x-api-key', 'x-base-url', 'x-provider-type', 'x-model']) {
      if (stripped.has(name)) {
        stripped.delete(name);
        changed = true;
      }
    }
    if (changed) {
      const refused = await accessCodeGate(request, pathname);
      return refused ?? NextResponse.next({ request: { headers: stripped } });
    }
  }

  return (await accessCodeGate(request, pathname)) ?? NextResponse.next();
}

/**
 * Staging access-code gate (spec R15). Returns a response when the request is
 * refused, null when it may proceed.
 */
async function accessCodeGate(
  request: NextRequest,
  pathname: string,
): Promise<NextResponse | null> {
  const accessCode = process.env.ACCESS_CODE;
  if (!accessCode) {
    return null;
  }

  // Whitelist: access-code endpoints, health check
  if (pathname.startsWith('/api/access-code/') || pathname === '/api/health') {
    return null;
  }
  // KAIZEN: the Stripe webhook authenticates by signature (billing-23) and
  // Stripe cannot carry the staging cookie.
  if (pathname === '/api/parent/billing/webhook') {
    return null;
  }
  // KAIZEN: the scheduler authenticates by CRON_SECRET and cannot carry the
  // staging cookie either; the one-click opt-out is opened from an email.
  if (pathname.startsWith('/api/tutor/cron/') || pathname === '/api/tutor/email/unsubscribe') {
    return null;
  }

  // Check cookie — validate HMAC signature, not just existence
  const cookie = request.cookies.get('openmaic_access');
  if (cookie?.value && (await verifyToken(cookie.value, accessCode))) {
    return null;
  }

  // API requests without valid cookie → 401
  if (pathname.startsWith('/api/')) {
    return NextResponse.json(
      { success: false, errorCode: 'INVALID_REQUEST', error: 'Access code required' },
      { status: 401 },
    );
  }

  // Page requests → let through, frontend shows modal
  return null;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|logos/).*)'],
};
