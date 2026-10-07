/**
 * Typed fetch client for the product API (lib/tutor/wire.ts shapes).
 *
 * Every call answers a `ClientResult`: `{ ok: true, data }` or a typed
 * failure. Failures are classified once here so screens can render the right
 * state without re-reading status codes: offline, unauthenticated (with a
 * redirect to sign-in), forbidden, no learner selected, not found, rate
 * limited, database not configured (503 DB_NOT_CONFIGURED, spec D19), invalid
 * input, or a generic error. The session cookie is httpOnly, so every request
 * goes out with `credentials: 'same-origin'`.
 */
import { PRODUCT_ROUTES } from '@/lib/tutor/contracts';
import type { ApiFailure } from '@/lib/tutor/wire';

export type FailureKind =
  | 'offline'
  | 'unauthenticated'
  | 'forbidden'
  | 'no_learner'
  | 'not_found'
  | 'rate_limited'
  | 'not_configured'
  | 'invalid'
  | 'error';

export interface ClientFailure {
  ok: false;
  kind: FailureKind;
  /** HTTP status; 0 when no response arrived. */
  status: number;
  /** `errorCode` from the body, or a client-side code (OFFLINE, NETWORK, BAD_RESPONSE). */
  code: string;
  /** Human-readable, safe to show inline. */
  message: string;
}

export interface ClientSuccess<T> {
  ok: true;
  data: T;
}

export type ClientResult<T> = ClientSuccess<T> | ClientFailure;
export type NotConfigured = ClientFailure & { kind: 'not_configured' };

export type QueryValue = string | number | boolean | null | undefined;

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  query?: Record<string, QueryValue>;
  /** JSON body; ignored when `formData` is set. */
  body?: unknown;
  formData?: FormData;
  signal?: AbortSignal;
  /** Auth forms handle their own 401 inline; everything else redirects to sign-in. */
  redirectOnUnauthenticated?: boolean;
}

export interface ClientEnvironment {
  fetch: typeof fetch;
  isOnline: () => boolean;
  /** Called on a 401 when the request allows redirects. */
  onUnauthenticated: (failure: ClientFailure) => void;
}

export const OFFLINE_MESSAGE = 'You are offline. Check the connection and try again.';
export const NETWORK_MESSAGE = 'Could not reach the server. Check the connection and try again.';
export const NOT_CONFIGURED_MESSAGE =
  'The product database is not configured yet. Set DATABASE_URL on the server.';

export function buildQuery(query?: Record<string, QueryValue>): string {
  if (!query) return '';
  const parts: string[] = [];
  for (const [key, value] of Object.entries(query)) {
    if (value === null || value === undefined || value === '') continue;
    parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
  }
  return parts.length > 0 ? `?${parts.join('&')}` : '';
}

/** Parses a response body; null when it is not a JSON object. */
export function parseApiBody(text: string): Record<string, unknown> | null {
  if (!text) return null;
  try {
    const parsed: unknown = JSON.parse(text);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
    return null;
  } catch {
    return null;
  }
}

function isApiFailure(
  body: Record<string, unknown> | null,
): body is ApiFailure & Record<string, unknown> {
  return Boolean(body) && body?.success === false;
}

function defaultMessage(status: number): string {
  switch (status) {
    case 400:
    case 422:
      return 'Something in the request was not valid.';
    case 401:
      return 'Sign in to continue.';
    case 403:
      return 'This account cannot do that.';
    case 404:
      return 'Not found.';
    case 429:
      return 'Too many attempts. Wait a minute and try again.';
    case 503:
      return NOT_CONFIGURED_MESSAGE;
    default:
      return status >= 500
        ? 'The server had a problem. Try again in a moment.'
        : 'Something went wrong.';
  }
}

/** Maps an HTTP status and (optional) failure body to one typed failure. */
export function classifyFailure(
  status: number,
  body: Record<string, unknown> | null,
): ClientFailure {
  const failure = isApiFailure(body) ? body : null;
  const code = failure?.errorCode ?? (status === 0 ? 'NETWORK' : `HTTP_${status}`);
  const message =
    failure && typeof failure.error === 'string' && failure.error.trim()
      ? failure.error
      : defaultMessage(status);
  let kind: FailureKind = 'error';
  if (code === 'DB_NOT_CONFIGURED' || status === 503) kind = 'not_configured';
  else if (status === 401) kind = 'unauthenticated';
  else if (status === 403) kind = code === 'NO_LEARNER' ? 'no_learner' : 'forbidden';
  else if (status === 404) kind = 'not_found';
  else if (status === 429) kind = 'rate_limited';
  else if (status === 400 || status === 409 || status === 413 || status === 422) kind = 'invalid';
  return { ok: false, kind, status, code, message };
}

export function offlineFailure(): ClientFailure {
  return { ok: false, kind: 'offline', status: 0, code: 'OFFLINE', message: OFFLINE_MESSAGE };
}

export function networkFailure(): ClientFailure {
  return { ok: false, kind: 'offline', status: 0, code: 'NETWORK', message: NETWORK_MESSAGE };
}

export function isNotConfigured(result: ClientResult<unknown>): result is NotConfigured {
  return !result.ok && result.kind === 'not_configured';
}

export interface TutorClient {
  request<T>(path: string, options?: RequestOptions): Promise<ClientResult<T>>;
  get<T>(path: string, query?: Record<string, QueryValue>): Promise<ClientResult<T>>;
  post<T>(path: string, body?: unknown, options?: RequestOptions): Promise<ClientResult<T>>;
  patch<T>(path: string, body?: unknown, options?: RequestOptions): Promise<ClientResult<T>>;
  del<T>(path: string, body?: unknown, options?: RequestOptions): Promise<ClientResult<T>>;
  upload<T>(path: string, formData: FormData, options?: RequestOptions): Promise<ClientResult<T>>;
}

export function createClient(env: ClientEnvironment): TutorClient {
  async function request<T>(path: string, options: RequestOptions = {}): Promise<ClientResult<T>> {
    if (!env.isOnline()) return offlineFailure();
    const method =
      options.method ?? (options.body !== undefined || options.formData ? 'POST' : 'GET');
    const headers: Record<string, string> = { accept: 'application/json' };
    let body: BodyInit | undefined;
    if (options.formData) {
      body = options.formData;
    } else if (options.body !== undefined) {
      headers['content-type'] = 'application/json';
      body = JSON.stringify(options.body);
    }
    let response: Response;
    try {
      response = await env.fetch(`${path}${buildQuery(options.query)}`, {
        method,
        headers,
        body,
        credentials: 'same-origin',
        signal: options.signal,
      });
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return { ok: false, kind: 'error', status: 0, code: 'ABORTED', message: 'Cancelled.' };
      }
      return env.isOnline() ? networkFailure() : offlineFailure();
    }
    const text = await response.text();
    const parsed = parseApiBody(text);
    if (response.ok && parsed && parsed.success === true) {
      const { success: _success, ...data } = parsed;
      return { ok: true, data: data as T };
    }
    if (response.ok) {
      return {
        ok: false,
        kind: 'error',
        status: response.status,
        code: 'BAD_RESPONSE',
        message: 'The server answered in an unexpected format.',
      };
    }
    const failure = classifyFailure(response.status, parsed);
    if (failure.kind === 'unauthenticated' && options.redirectOnUnauthenticated !== false) {
      env.onUnauthenticated(failure);
    }
    return failure;
  }

  return {
    request,
    get: (path, query) => request(path, { method: 'GET', query }),
    post: (path, body, options) => request(path, { ...options, method: 'POST', body: body ?? {} }),
    patch: (path, body, options) =>
      request(path, { ...options, method: 'PATCH', body: body ?? {} }),
    del: (path, body, options) => request(path, { ...options, method: 'DELETE', body: body ?? {} }),
    upload: (path, formData, options) => request(path, { ...options, method: 'POST', formData }),
  };
}

/** Sign-in URL that returns the visitor to where they were; the auth forms and the operator's sign-in use it. */
export function signInUrlFor(pathname: string, search = ''): string {
  const next = `${pathname}${search}`;
  const isAuthPage = pathname === '/sign-in' || pathname === '/sign-up';
  return isAuthPage || next === '/' ? '/sign-in' : `/sign-in?next=${encodeURIComponent(next)}`;
}

/**
 * Where a 401 sends the browser: the landing page, which is where anyone
 * without a cookie starts (D35). A guest whose cookie expired or whose rows
 * were deleted has no sign-in to go to; the landing page's start form is the
 * way back in. The auth pages handle their own 401 inline and never redirect.
 */
export function unauthenticatedUrlFor(pathname: string): string | null {
  if (pathname === PRODUCT_ROUTES.landing || pathname === '/') return null;
  if (pathname === PRODUCT_ROUTES.signIn || pathname === PRODUCT_ROUTES.signUp) return null;
  return PRODUCT_ROUTES.landing;
}

function browserEnvironment(): ClientEnvironment {
  return {
    fetch: (input, init) => fetch(input, init),
    isOnline: () => (typeof navigator === 'undefined' ? true : navigator.onLine !== false),
    onUnauthenticated: () => {
      if (typeof window === 'undefined') return;
      const target = unauthenticatedUrlFor(window.location.pathname);
      if (target) window.location.assign(target);
    },
  };
}

/** The shared browser client. Server code never uses it (it reads the database directly). */
export const client: TutorClient = createClient(browserEnvironment());
