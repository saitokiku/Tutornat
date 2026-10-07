import type { ApiErrorCode } from '@/lib/server/api-response';

/**
 * A typed refusal from the accounts layer. Routes map it to
 * `apiError(code, status, message)` unchanged, so the wire body is decided in
 * one place and the message never carries a name, an email, or an age.
 */
export class AccountsError extends Error {
  constructor(
    readonly code: ApiErrorCode,
    readonly status: number,
    message: string,
    /** Extra response headers, for example `retry-after` on a 429. */
    readonly headers?: Readonly<Record<string, string>>,
  ) {
    super(message);
    this.name = 'AccountsError';
  }
}

export function notFound(what = 'Not found'): AccountsError {
  return new AccountsError('NOT_FOUND', 404, what);
}
