/**
 * Form validation for the product's forms (sign-up, sign-in, learner
 * profiles, coursework). Pure functions: each returns an error message or
 * null so a form can show it inline and move focus to the first error.
 */

/**
 * Mirrors PASSWORD_MIN_LENGTH in lib/tutor/auth/password.ts, which is
 * server-only (node:crypto). tests/tutor/shell-helpers.test.ts pins parity.
 */
export const PASSWORD_MIN_LENGTH = 10;
export const PASSWORD_MAX_LENGTH = 200;
export const DISPLAY_NAME_MAX_LENGTH = 60;
export const LOGIN_NAME_PATTERN = /^[a-z0-9][a-z0-9._-]{2,23}$/i;
export const PROBLEM_TITLE_MAX_LENGTH = 120;
export const PROBLEM_TEXT_MAX_LENGTH = 4000;
export const OLDEST_BIRTH_YEAR_OFFSET = 110;
export const UPLOAD_MAX_BYTES = 20 * 1024 * 1024;
export const UPLOAD_ACCEPT =
  '.jpg,.jpeg,.png,.heic,.pdf,image/jpeg,image/png,image/heic,application/pdf';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const UPLOAD_EXTENSIONS = ['jpg', 'jpeg', 'png', 'heic', 'pdf'];

export function validateEmail(value: string): string | null {
  const email = value.trim();
  if (!email) return 'Enter an email address.';
  if (email.length > 254 || !EMAIL_PATTERN.test(email)) return 'Enter a valid email address.';
  return null;
}

export function validatePassword(value: string): string | null {
  if (!value) return 'Enter a password.';
  if (value.length < PASSWORD_MIN_LENGTH) {
    return `Use at least ${PASSWORD_MIN_LENGTH} characters.`;
  }
  if (value.length > PASSWORD_MAX_LENGTH) return `Use at most ${PASSWORD_MAX_LENGTH} characters.`;
  return null;
}

export function validateDisplayName(value: string, what = 'a name'): string | null {
  const name = value.trim();
  if (!name) return `Enter ${what}.`;
  if (name.length > DISPLAY_NAME_MAX_LENGTH) {
    return `Use at most ${DISPLAY_NAME_MAX_LENGTH} characters.`;
  }
  return null;
}

export function validateLoginName(value: string): string | null {
  const name = value.trim();
  if (!name) return 'Enter a login name.';
  if (!LOGIN_NAME_PATTERN.test(name)) {
    return 'Use 3 to 24 letters, digits, dots, dashes, or underscores.';
  }
  return null;
}

export interface BirthYearCheck {
  error: string | null;
  year: number | null;
}

/** Neutral age screen (spec R10, §11.2 item 1): a year, no nudging. */
export function validateBirthYear(value: string, now = new Date()): BirthYearCheck {
  const raw = value.trim();
  if (!raw) return { error: 'Enter a birth year.', year: null };
  if (!/^\d{4}$/.test(raw)) return { error: 'Enter a four-digit year.', year: null };
  const year = Number(raw);
  const thisYear = now.getUTCFullYear();
  if (year > thisYear) return { error: 'That year is in the future.', year: null };
  if (year < thisYear - OLDEST_BIRTH_YEAR_OFFSET) return { error: 'Check the year.', year: null };
  return { error: null, year };
}

export function validateProblemTitle(value: string): string | null {
  const title = value.trim();
  if (!title) return 'Give this problem a short title.';
  if (title.length > PROBLEM_TITLE_MAX_LENGTH) {
    return `Use at most ${PROBLEM_TITLE_MAX_LENGTH} characters.`;
  }
  return null;
}

export function validateProblemText(value: string): string | null {
  const text = value.trim();
  if (!text) return 'Type the problem.';
  if (text.length > PROBLEM_TEXT_MAX_LENGTH) {
    return `Use at most ${PROBLEM_TEXT_MAX_LENGTH} characters.`;
  }
  return null;
}

/**
 * jpg, png, heic, or pdf (spec R3). Checks the extension because browsers
 * report no reliable MIME type for HEIC.
 */
export function validateUploadFile(file: {
  name: string;
  size: number;
  type: string;
}): string | null {
  const extension = file.name.toLowerCase().split('.').pop() ?? '';
  if (!UPLOAD_EXTENSIONS.includes(extension)) return 'Choose a photo (jpg, png, heic) or a PDF.';
  if (file.size === 0) return 'That file is empty.';
  if (file.size > UPLOAD_MAX_BYTES) return 'Choose a file under 20 MB.';
  return null;
}

export type FieldErrors<K extends string> = Partial<Record<K, string>>;

/** The first key with an error, in the order given, so focus can move to it. */
export function firstErrorKey<K extends string>(
  errors: FieldErrors<K>,
  order: readonly K[],
): K | null {
  for (const key of order) if (errors[key]) return key;
  return null;
}

export function hasErrors<K extends string>(errors: FieldErrors<K>): boolean {
  return Object.values(errors).some((value) => Boolean(value));
}
