import type { Key } from "@/i18n/en";

// Account form rules, shared by the browser (lib/auth.ts) and the server (auth.ts) so both refuse the
// same things with the same messages. Pure.

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const PASSWORD_MIN = 8;
/** scrypt work grows with the input; nobody needs a longer password than this. */
export const PASSWORD_MAX = 200;
export const NAME_MAX = 80;
export const EMAIL_MAX = 254;

export type FieldErrors = Partial<Record<"email" | "password" | "displayName", Key>>;

export const normEmail = (email: string) => email.trim().toLowerCase();

export function validate(input: { email?: string; password?: string; displayName?: string }): FieldErrors {
  const fields: FieldErrors = {};
  if (input.email !== undefined && (!EMAIL_RE.test(input.email.trim()) || input.email.trim().length > EMAIL_MAX)) fields.email = "err.email";
  if (input.password !== undefined) {
    if (input.password.length < PASSWORD_MIN) fields.password = "err.password";
    else if (input.password.length > PASSWORD_MAX) fields.password = "acct.err.passwordLong";
  }
  if (input.displayName !== undefined && !input.displayName.trim()) fields.displayName = "err.name";
  return fields;
}
