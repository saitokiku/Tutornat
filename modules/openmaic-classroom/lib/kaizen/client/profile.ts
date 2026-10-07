/**
 * Local learner profile for the Kaizen surface.
 *
 * Two fields, two very different privacy classes:
 *
 * - `nickname` is a **device-local label only**. It is never put in a model
 *   prompt, a request body or a log line. `buildRequirements` in
 *   ./course-request.ts is the single place that could leak it and it strips
 *   the field explicitly; the test asserts that.
 * - `age` is self-reported and *does* go to the model, because age is what
 *   makes the teaching age-appropriate. Self-reported age is not verified age,
 *   guardian consent, or evidence of reading ability.
 *
 * Stored in `localStorage` rather than the upstream `user-profile` KV store on
 * purpose: that store is documented as "exactly the data a server-backed
 * deployment is expected to carry across their devices", which is the opposite
 * of the requirement for the nickname.
 */

export type KaizenLang = 'en-US' | 'es-MX';

export interface KaizenProfile {
  /** Device-local display label. Never leaves the device. */
  nickname: string;
  /** Self-reported. Guides vocabulary/pacing only. */
  age: number | null;
  lang: KaizenLang;
}

export const STORAGE_KEY = 'kaizen.learner.v1';

export const DEFAULT_PROFILE: KaizenProfile = { nickname: '', age: null, lang: 'en-US' };

/**
 * Tap targets for age, so nobody has to read a form to start. The band is the
 * affordance; the exact number is the typed backup. Band midpoints are used as
 * the reported age when a learner picks a band instead of typing — the model
 * only needs a pacing hint, not a birthday.
 */
export const AGE_BANDS: ReadonlyArray<{ id: string; min: number; max: number; report: number }> = [
  { id: 'young-child', min: 3, max: 6, report: 5 },
  { id: 'child', min: 7, max: 10, report: 8 },
  { id: 'preteen', min: 11, max: 13, report: 12 },
  { id: 'teen', min: 14, max: 17, report: 15 },
  { id: 'adult', min: 18, max: 64, report: 30 },
  { id: 'older-adult', min: 65, max: 120, report: 70 },
];

export function bandForAge(age: number | null): string | null {
  if (age == null) return null;
  return AGE_BANDS.find((b) => age >= b.min && age <= b.max)?.id ?? null;
}

/** An age we are willing to send as a pacing hint. Anything else is "unknown". */
export function normalizeAge(input: unknown): number | null {
  const n = typeof input === 'number' ? input : Number.parseInt(String(input ?? ''), 10);
  if (!Number.isFinite(n)) return null;
  const whole = Math.trunc(n);
  return whole >= 2 && whole <= 120 ? whole : null;
}

export function isLang(value: unknown): value is KaizenLang {
  return value === 'en-US' || value === 'es-MX';
}

/** A profile is startable once an age is known. A nickname is optional. */
export function profileReady(profile: KaizenProfile): boolean {
  return profile.age != null;
}

/**
 * One accessor for the store, fully guarded.
 *
 * `typeof localStorage` is not enough: Node exposes a `localStorage` global
 * that *throws on access* when `--localstorage-file` is absent, and Safari
 * private mode throws on write. Both are "no local storage", not a crash on
 * the learner's first paint.
 */
function store(): Pick<Storage, 'getItem' | 'setItem'> | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

export function loadProfile(): KaizenProfile {
  const ls = store();
  if (!ls) return { ...DEFAULT_PROFILE };
  try {
    const raw = ls.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_PROFILE };
    const parsed = JSON.parse(raw) as Partial<KaizenProfile>;
    return {
      nickname: typeof parsed.nickname === 'string' ? parsed.nickname.slice(0, 40) : '',
      age: normalizeAge(parsed.age),
      lang: isLang(parsed.lang) ? parsed.lang : 'en-US',
    };
  } catch {
    // Unreadable local profile is not an error worth surfacing — the learner
    // just gets the first-run picker again.
    return { ...DEFAULT_PROFILE };
  }
}

export function saveProfile(profile: KaizenProfile): void {
  try {
    store()?.setItem(STORAGE_KEY, JSON.stringify(profile));
  } catch {
    // Storage refused (private mode, quota). The session still works in memory.
  }
}
