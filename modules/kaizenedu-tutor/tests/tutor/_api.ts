/**
 * Route-test helpers for the product API: build a Request the way a browser
 * would (cookie, JSON body, query), call the exported handler directly, and
 * hand back status, parsed body, and headers. Underscore-prefixed so vitest
 * never collects it (tests/tutor/_db.ts pattern).
 */
import { POST as signUpRoute } from '@/app/(learner)/api/tutor/auth/sign-up/route';
import { POST as createLearnerRoute } from '@/app/(parent)/api/parent/learners/route';
import { AUTH_API, PARENT_API } from '@/lib/tutor/contracts';
import type { CreateLearnerRequest, CreateLearnerResponse, SignUpResponse } from '@/lib/tutor/wire';

export type RouteHandler = (request: Request) => Promise<Response>;

export const PASSWORD = 'correct horse battery staple';
export const THIS_YEAR = new Date().getUTCFullYear();
export const birthYearForAge = (age: number): number => THIS_YEAR - age;

export interface CallOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  cookie?: string | null;
  /** A string is sent verbatim (to test malformed JSON); anything else is JSON-encoded. */
  body?: unknown;
  query?: Record<string, string>;
  headers?: Record<string, string>;
}

export interface ApiCall<T> {
  status: number;
  body: T & { success: boolean; errorCode?: string; error?: string };
  headers: Headers;
}

export async function call<T = Record<string, unknown>>(
  handler: RouteHandler,
  path: string,
  options: CallOptions = {},
): Promise<ApiCall<T>> {
  const url = new URL(`http://localhost${path}`);
  for (const [key, value] of Object.entries(options.query ?? {})) url.searchParams.set(key, value);
  const headers = new Headers(options.headers ?? {});
  if (options.cookie) headers.set('cookie', options.cookie);
  let body: string | undefined;
  if (options.body !== undefined) {
    headers.set('content-type', 'application/json');
    body = typeof options.body === 'string' ? options.body : JSON.stringify(options.body);
  }
  const method = options.method ?? (body === undefined ? 'GET' : 'POST');
  const response = await handler(new Request(url, { method, headers, body }));
  const parsed = (await response.json()) as ApiCall<T>['body'];
  return { status: response.status, body: parsed, headers: response.headers };
}

/** The `cookie` request header that carries the session set by a response. */
export function cookieOf(headers: Headers): string {
  const match = /nt_session=([^;]+)/.exec(headers.get('set-cookie') ?? '');
  if (!match) throw new Error('response set no session cookie');
  return `nt_session=${match[1]}`;
}

export async function signUpParent(
  email: string,
  displayName = 'Pat',
): Promise<{ cookie: string; state: SignUpResponse }> {
  const res = await call<SignUpResponse>(signUpRoute, AUTH_API.signUp, {
    body: { email, password: PASSWORD, displayName, kind: 'parent' },
  });
  if (res.status !== 201) throw new Error(`sign-up failed: ${res.status} ${res.body.error}`);
  return { cookie: cookieOf(res.headers), state: res.body };
}

export async function signUpAdult(
  email: string,
  birthYear = 1990,
): Promise<{ cookie: string; state: SignUpResponse }> {
  const res = await call<SignUpResponse>(signUpRoute, AUTH_API.signUp, {
    body: { email, password: PASSWORD, displayName: 'Alex', kind: 'adult', birthYear },
  });
  if (res.status !== 201) throw new Error(`sign-up failed: ${res.status} ${res.body.error}`);
  return { cookie: cookieOf(res.headers), state: res.body };
}

export async function addLearner(
  cookie: string,
  input: CreateLearnerRequest,
): Promise<CreateLearnerResponse> {
  const res = await call<CreateLearnerResponse>(createLearnerRoute, PARENT_API.learners, {
    cookie,
    body: input,
  });
  if (res.status !== 201) throw new Error(`create learner failed: ${res.status} ${res.body.error}`);
  return res.body;
}
