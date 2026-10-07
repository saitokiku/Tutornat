import type { Key } from "@/i18n/en";
import { validate, type FieldErrors } from "./server/db/fields";
import { CONSENT_NOTICE_VERSION, consentAllows, needsConsent, type ConsentReceipt, type ConsentScope } from "./server/db/policy";
import type { PublicAccount } from "./server/db/wire";
import { newId, read, update, useStore } from "./store";
import { activeAccount, knownStatus, receipts, serverStatus, signedIn, signedOut, storeReceipts, syncNow, useReceipts, useServerStatus, useSyncState } from "./sync";
import type { Account, Locale } from "./types";

// Accounts, both ways the app runs:
//   - with a server (DATABASE_URL set): the account lives on the server (scrypt, cookie session);
//     the browser keeps a copy of the family and syncs it (lib/sync.ts);
//   - browser-only: demo accounts live in this browser. SHA-256 + salt is a convenience there, not
//     security, and the screens say so.
// Screens call the same functions either way.

const RESET_TTL_MS = 30 * 60 * 1000;

export { validate };
export type { FieldErrors };
export type Result = { ok: true } | { ok: false; error?: Key; fields?: FieldErrors; retryMinutes?: number };

async function hash(password: string, salt: string) {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${salt}:${password}`));
  return Array.from(new Uint8Array(bytes), (b) => b.toString(16).padStart(2, "0")).join("");
}

const norm = (email: string) => email.trim().toLowerCase();
const findAccount = (email: string) => read().accounts.find((a) => a.email === norm(email));
/** A browser-only account (it has a local password); server accounts keep none here. */
const localOnly = (a: Account | undefined) => (a?.passwordHash ? a : undefined);

/** The browser-only account with this email and password, if this browser has one. */
async function localMatch(email: string, password: string): Promise<string | null> {
  const a = localOnly(findAccount(email));
  return a && (await hash(password, a.salt)) === a.passwordHash ? a.id : null;
}

type Answer = { status: number; body: Record<string, unknown> };
async function post(path: string, body: unknown): Promise<Answer | null> {
  try {
    const res = await fetch(path, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    return { status: res.status, body: ((await res.json().catch(() => ({}))) as Record<string, unknown>) ?? {} };
  } catch {
    return null;
  }
}

function failure(a: Answer | null): Result {
  if (!a) return { ok: false, error: "acct.err.offline" };
  if (a.status === 429) return { ok: false, error: "acct.err.rate", retryMinutes: Math.max(1, Math.ceil(Number(a.body.retryAfter ?? 60) / 60)) };
  if (a.body.error === "adult") return { ok: false, error: "acct.err.adult" };
  if (a.body.error === "bad-login") return { ok: false, error: "err.badLogin" };
  if (a.body.error === "invalid-link") return { ok: false, error: "auth.resetInvalid" };
  if (a.body.fields) return { ok: false, fields: a.body.fields as FieldErrors };
  return { ok: false, error: "acct.err.server" };
}

/** `adult`: the grown-up's statement that they are 18 or older (asked when accounts live on the server). */
export async function signUp(input: { email: string; password: string; displayName: string; adult?: boolean }): Promise<Result> {
  const fields = validate(input);
  if (Object.keys(fields).length) return { ok: false, fields };
  if ((await serverStatus()).mode === "server") {
    if (!input.adult) return { ok: false, error: "acct.err.adult" };
    const adopt = await localMatch(input.email, input.password);
    const a = await post("/api/auth/sign-up", input);
    if (a?.status !== 200) return failure(a);
    await signedIn(a.body.account as PublicAccount, { adopt, unlocked: true });
    return { ok: true };
  }
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
  if ((await serverStatus()).mode === "server") {
    const adopt = await localMatch(email, password);
    const a = await post("/api/auth/sign-in", { email, password });
    if (a?.status !== 200) {
      // Saved before this site kept accounts on a server: say how to bring it along.
      if (a?.status === 401 && adopt) return { ok: false, error: "acct.err.localOnly" };
      return failure(a);
    }
    await signedIn(a.body.account as PublicAccount, { adopt, unlocked: true });
    return { ok: true };
  }
  const account = findAccount(email);
  if (!account || (await hash(password, account.salt)) !== account.passwordHash) return { ok: false, error: "err.badLogin" };
  update((s) => void (s.session = { accountId: account.id, profileId: null, unlocked: true }));
  return { ok: true };
}

/**
 * Signs out with a full page load: on a shared family device nothing from the last session should
 * stay in memory, and no route guard can race the navigation. With a server, what's waiting is sent
 * first and the family's copy leaves this device.
 */
export async function signOut() {
  if (activeAccount()) await signedOut();
  // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- deliberate full reload
  if (typeof window !== "undefined") window.location.assign("/");
  update((s) => void (s.session = { accountId: null, profileId: null }));
}

/** Browser-only: returns a token when the account exists (the page shows the link; there is no email). */
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

export type ResetRequest =
  | { ok: true; delivery: "sent" | "not-configured" | "failed"; link?: string }
  | { ok: false; error: Key; retryMinutes?: number };

/**
 * Asks for a reset link. With a server it goes by email (or, in development without email, the link
 * comes back to show on the page). Browser-only, the link is always shown: there is no email.
 */
export async function requestPasswordReset(email: string, locale: Locale): Promise<ResetRequest> {
  if ((await serverStatus()).mode !== "server") {
    const token = requestReset(email);
    return { ok: true, delivery: "not-configured", link: token ? `/reset-password?token=${token}` : undefined };
  }
  const a = await post("/api/auth/reset", { email, locale });
  if (a?.status !== 200) {
    const f = failure(a) as { error?: Key; retryMinutes?: number };
    return { ok: false, error: f.error ?? "acct.err.server", retryMinutes: f.retryMinutes };
  }
  const delivery = a.body.delivery === "sent" || a.body.delivery === "failed" ? a.body.delivery : "not-configured";
  return { ok: true, delivery, link: typeof a.body.devLink === "string" ? a.body.devLink : undefined };
}

export const resetTokenValid = (token: string) => read().resets.some((r) => r.token === token && r.expires > Date.now());

/** Whether a reset link still works (asks the server when there is one). */
export async function checkResetToken(token: string): Promise<boolean> {
  if ((await serverStatus()).mode !== "server") return resetTokenValid(token);
  const a = await post("/api/auth/reset/check", { token });
  return a?.status === 200 && a.body.valid === true;
}

/** With a server, a reset also signs this browser in (`signedIn`); browser-only, the grown-up signs in next. */
export async function resetPassword(token: string, password: string): Promise<Result & { signedIn?: boolean }> {
  const fields = validate({ password });
  if (fields.password) return { ok: false, fields };
  if ((await serverStatus()).mode === "server") {
    const a = await post("/api/auth/reset/confirm", { token, password });
    if (a?.status !== 200) return failure(a);
    await signedIn(a.body.account as PublicAccount, { unlocked: true });
    return { ok: true, signedIn: true };
  }
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

// ---- consent for the AI tutor and voice (parent-first; see server/db/policy.ts) ------------------

/** True when accounts live on the server and this browser is signed in to one. */
export const accountsOnServer = () => Boolean(activeAccount());
export { useServerStatus, useSyncState, CONSENT_NOTICE_VERSION };
export type { ConsentReceipt, ConsentScope };

export type ConsentGate = { needed: boolean; ai: boolean; voice: boolean };
const OPEN: ConsentGate = { needed: false, ai: true, voice: true };

/**
 * Whether this learner may use the AI tutor and voice. Browser-only there are no accounts on a server,
 * so nothing changes; with a server, a child needs a grown-up's consent first, and in production an
 * under-13 learner needs a verified method. Screens hide or explain the AI and microphone when off.
 */
export function useConsent(profileId: string | null | undefined): ConsentGate {
  const list = useReceipts();
  const status = useServerStatus();
  const profile = useStore((s) => s.profiles.find((p) => p.id === profileId));
  if (!accountsOnServer() || !profile || !needsConsent(profile.grade)) return OPEN;
  const mine = list.filter((r) => r.profileId === profile.id);
  const production = status?.production ?? true;
  const ai = consentAllows({ grade: profile.grade, receipts: mine, scope: "ai", production });
  const voice = consentAllows({ grade: profile.grade, receipts: mine, scope: "voice", production });
  return { needed: !(ai && voice), ai, voice };
}

/** The same answer outside React (for request code). */
export function consentFor(profileId: string, scope: ConsentScope): boolean {
  const profile = read().profiles.find((p) => p.id === profileId);
  if (!accountsOnServer() || !profile) return true;
  const production = knownStatus()?.production ?? true;
  return consentAllows({ grade: profile.grade, receipts: receipts().filter((r) => r.profileId === profileId), scope, production });
}

/** Send with AI and voice requests so the server can check the learner's consent (an id, never a name). */
export const learnerHeaders = (profileId: string | null | undefined): Record<string, string> =>
  profileId && profileId !== "parent" ? { "x-kaizen-learner": profileId } : {};

export type ConsentMethodInfo = { id: string; verified: boolean; forUnder13: boolean };
export type ConsentOptions = { methods: ConsentMethodInfo[]; noticeVersion: string; receipts: ConsentReceipt[] };

/** The receipts on the account and the ways consent can be given on this deployment. */
export async function loadConsent(): Promise<ConsentOptions | null> {
  try {
    const res = await fetch("/api/consent", { cache: "no-store" });
    if (!res.ok) return null;
    const body = (await res.json()) as ConsentOptions;
    storeReceipts(body.receipts);
    return body;
  } catch {
    return null;
  }
}

/** `proof`: what a verified method's own flow handed back, for the server to confirm with the vendor. */
export type GrantInput = { profileId: string; scope: ConsentScope[]; method: string; under13: boolean; proof?: string };

export async function grantConsent(input: GrantInput): Promise<{ ok: true; receipt: ConsentReceipt } | { ok: false; error: Key }> {
  // A learner added a moment ago must reach the server before consent can name them.
  await syncNow();
  const a = await post("/api/consent", { ...input, noticeVersion: CONSENT_NOTICE_VERSION });
  if (!a) return { ok: false, error: "acct.err.offline" };
  if (a.status !== 200) return { ok: false, error: a.body.error === "method" ? "acct.consent.errMethod" : a.body.error === "learner" ? "acct.consent.errLearner" : "acct.err.server" };
  storeReceipts(a.body.receipts as ConsentReceipt[]);
  return { ok: true, receipt: a.body.receipt as ConsentReceipt };
}

export async function revokeConsent(id: string): Promise<boolean> {
  const a = await post("/api/consent/revoke", { id });
  if (a?.status !== 200) return false;
  storeReceipts(a.body.receipts as ConsentReceipt[]);
  return true;
}
