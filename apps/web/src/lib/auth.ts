import type { Key } from "@/i18n/en";
import { newId, read, update } from "./store";
import type { Account } from "./types";

// Demo accounts live in this browser only. SHA-256 + salt is a convenience, not security:
// the real backend replaces this file (modules/kaizenedu-tutor/lib/tutor/auth has scrypt + sessions).

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RESET_TTL_MS = 30 * 60 * 1000;

export type FieldErrors = Partial<Record<"email" | "password" | "displayName", Key>>;
export type Result = { ok: true } | { ok: false; error?: Key; fields?: FieldErrors };

async function hash(password: string, salt: string) {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${salt}:${password}`));
  return Array.from(new Uint8Array(bytes), (b) => b.toString(16).padStart(2, "0")).join("");
}

const norm = (email: string) => email.trim().toLowerCase();
const findAccount = (email: string) => read().accounts.find((a) => a.email === norm(email));

export function validate(input: { email?: string; password?: string; displayName?: string }): FieldErrors {
  const fields: FieldErrors = {};
  if (input.email !== undefined && !EMAIL_RE.test(input.email.trim())) fields.email = "err.email";
  if (input.password !== undefined && input.password.length < 8) fields.password = "err.password";
  if (input.displayName !== undefined && !input.displayName.trim()) fields.displayName = "err.name";
  return fields;
}

export async function signUp(input: { email: string; password: string; displayName: string }): Promise<Result> {
  const fields = validate(input);
  if (Object.keys(fields).length) return { ok: false, fields };
  if (findAccount(input.email)) return { ok: false, fields: { email: "err.emailTaken" } };
  const salt = newId();
  const account: Account = {
    id: newId(),
    email: norm(input.email),
    displayName: input.displayName.trim(),
    salt,
    passwordHash: await hash(input.password, salt),
    createdAt: Date.now(),
  };
  update((s) => {
    s.accounts.push(account);
    s.session = { accountId: account.id, profileId: null, unlocked: true };
  });
  return { ok: true };
}

export async function signIn(email: string, password: string): Promise<Result> {
  const account = findAccount(email);
  if (!account || (await hash(password, account.salt)) !== account.passwordHash) return { ok: false, error: "err.badLogin" };
  update((s) => void (s.session = { accountId: account.id, profileId: null, unlocked: true }));
  return { ok: true };
}

/**
 * Signs out with a full page load: on a shared family device nothing from the last session should
 * stay in memory, and no route guard can race the navigation.
 */
export function signOut() {
  // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- deliberate full reload
  if (typeof window !== "undefined") window.location.assign("/");
  update((s) => void (s.session = { accountId: null, profileId: null }));
}

/** Returns a token when the account exists (demo shows the link inline; real email comes with the backend). */
export function requestReset(email: string): string | null {
  const account = findAccount(email);
  if (!account) return null;
  const token = newId();
  update((s) => {
    s.resets = s.resets.filter((r) => r.expires > Date.now() && r.accountId !== account.id);
    s.resets.push({ token, accountId: account.id, expires: Date.now() + RESET_TTL_MS });
  });
  return token;
}

export const resetTokenValid = (token: string) => read().resets.some((r) => r.token === token && r.expires > Date.now());

export async function resetPassword(token: string, password: string): Promise<Result> {
  const fields = validate({ password });
  if (fields.password) return { ok: false, fields };
  const reset = read().resets.find((r) => r.token === token && r.expires > Date.now());
  if (!reset) return { ok: false, error: "auth.resetInvalid" };
  const salt = newId();
  const passwordHash = await hash(password, salt);
  update((s) => {
    const a = s.accounts.find((x) => x.id === reset.accountId);
    if (a) Object.assign(a, { salt, passwordHash });
    s.resets = s.resets.filter((r) => r.token !== token);
  });
  return { ok: true };
}
