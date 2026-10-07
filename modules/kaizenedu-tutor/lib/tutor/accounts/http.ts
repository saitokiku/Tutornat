/**
 * Route plumbing shared by the auth and parent handlers: JSON body parsing
 * against a schema, query parameters, the request id used as consent
 * evidence, cookie headers, and the mapping of `AccountsError` to `apiError`.
 */
import type { NextResponse } from 'next/server';
import type { ZodType } from 'zod';

import { apiError } from '@/lib/server/api-response';
import { dbNotConfiguredResponse } from '@/lib/tutor/auth/principal';
import { newId } from '@/lib/tutor/auth/session';
import { DbNotConfiguredError, getTutorDb, type TutorDb } from '@/lib/tutor/db';

import { AccountsError } from './errors';

export type Parsed<T> = { ok: true; data: T } | { ok: false; response: NextResponse };

/**
 * For the routes that run before a session exists (sign-up, sign-in): the
 * same 503 `requirePrincipal` answers when DATABASE_URL is missing.
 */
export async function openDb(
  action = 'do that',
): Promise<{ ok: true; db: TutorDb } | { ok: false; response: NextResponse }> {
  try {
    return { ok: true, db: await getTutorDb() };
  } catch (error) {
    if (error instanceof DbNotConfiguredError)
      return { ok: false, response: dbNotConfiguredResponse(action) };
    throw error;
  }
}

export function parseWith<T>(schema: ZodType<T>, value: unknown): Parsed<T> {
  const result = schema.safeParse(value ?? {});
  if (result.success) return { ok: true, data: result.data };
  const issue = result.error.issues[0];
  const field = issue?.path.map(String).join('.') ?? '';
  const message = issue?.message ?? 'Invalid request';
  return {
    ok: false,
    response: apiError('INVALID_REQUEST', 400, field ? `${field}: ${message}` : message),
  };
}

export async function parseJsonBody<T>(request: Request, schema: ZodType<T>): Promise<Parsed<T>> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return { ok: false, response: apiError('INVALID_REQUEST', 400, 'The body must be JSON.') };
  }
  return parseWith(schema, body);
}

export function queryParam(request: Request, name: string): string | null {
  const value = new URL(request.url).searchParams.get(name)?.trim();
  return value ? value : null;
}

export function missingQueryParam(name: string): NextResponse {
  return apiError('MISSING_REQUIRED_FIELD', 400, `${name} is required.`);
}

/** The platform request id when present (Vercel sets x-vercel-id), else a fresh one. */
export function requestId(request: Request): string {
  return request.headers.get('x-request-id') ?? request.headers.get('x-vercel-id') ?? newId('req');
}

export function withSetCookie<R extends Response>(response: R, header: string): R {
  response.headers.append('set-cookie', header);
  return response;
}

/** Null when the error is not an AccountsError; the route rethrows those. */
export function accountsErrorResponse(error: unknown): NextResponse | null {
  if (!(error instanceof AccountsError)) return null;
  const response = apiError(error.code, error.status, error.message);
  for (const [name, value] of Object.entries(error.headers ?? {}))
    response.headers.set(name, value);
  return response;
}
