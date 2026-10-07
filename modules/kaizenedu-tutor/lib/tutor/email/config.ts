/**
 * Whether this deployment can send email at all. Two variables: the Resend
 * key and the verified sender. Missing either is a designed state, not an
 * error: the wrapper returns `not_configured`, the forms say so, and
 * `/api/tutor/health` and `pnpm doctor` name the variables — presence only,
 * never the key.
 */
export const EMAIL_KEY_ENV = 'RESEND_API_KEY';
export const EMAIL_FROM_ENV = 'EMAIL_FROM';

/** `process.env`, or the handful of variables a test wants to pretend are set. */
export type EnvLike = Record<string, string | undefined>;

export interface EmailConfig {
  configured: boolean;
  apiKey: string | null;
  from: string | null;
  /** Variable names still unset, in the order to fix them. */
  missing: string[];
}

export function emailConfig(env: EnvLike = process.env): EmailConfig {
  const apiKey = env[EMAIL_KEY_ENV]?.trim() || null;
  const from = env[EMAIL_FROM_ENV]?.trim() || null;
  const missing: string[] = [];
  if (!apiKey) missing.push(EMAIL_KEY_ENV);
  if (!from) missing.push(EMAIL_FROM_ENV);
  return { configured: missing.length === 0, apiKey, from, missing };
}

export interface EmailConfigStatus {
  configured: boolean;
  missing: string[];
}

/** The safe-to-publish half: what is set, never what it is set to. */
export function emailConfigStatus(env: EnvLike = process.env): EmailConfigStatus {
  const { configured, missing } = emailConfig(env);
  return { configured, missing };
}
