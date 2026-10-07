/**
 * E2 part B — versioned rule parameters for the exposure ledger, the
 * eligibility clock and the quiet-window scheduler (SPEC §3.1; E13
 * definitions from the E2 context pack, ADR-0064 proposed). Every ledger row,
 * latch, offer and eligibility answer names the version it was computed under,
 * so a later rule change can never count an old event under a rule it did not
 * meet. Nothing here claims certification: `rule_version` `e2-draft-1` is a
 * draft until ADR-0064 is accepted.
 */

export const EXPOSURE_RULE_VERSION = 'e2-draft-1';

const HOUR_MS = 3_600_000;
const DAY_MS = 24 * HOUR_MS;

export interface ExposureRules {
  readonly version: string;
  /** Exactly ≥ this many microseconds of server time since the last exposure touching a skill. */
  readonly eligibilityDelayMicros: number;
  /** Clean (unassisted, correct, hint-free) practice reps that give a skill quiet-window priority. */
  readonly cleanRepsForPriority: number;
  /** Priority held this long with no quiet window taken → the parent is told plainly. */
  readonly noWindowEscalationMicros: number;
}

export const EXPOSURE_RULES: ExposureRules = Object.freeze({
  version: EXPOSURE_RULE_VERSION,
  eligibilityDelayMicros: 48 * HOUR_MS * 1000,
  cleanRepsForPriority: 10,
  noWindowEscalationMicros: 14 * DAY_MS * 1000,
});

/** Delivery modalities the ledger must cover (ENGINE-CONTRACT "every delivery modality covered"). */
export type ExposureSource = 'text' | 'audio' | 'canvas';
export const EXPOSURE_SOURCES: readonly ExposureSource[] = ['text', 'audio', 'canvas'];

/** What the learner was exposed to. Every kind resets eligibility; the kind is provenance, not weight. */
export type ExposureKind = 'instruction' | 'hint' | 'worked_example' | 'answer';
export const EXPOSURE_KINDS: readonly ExposureKind[] = ['instruction', 'hint', 'worked_example', 'answer'];

/** Skill id meaning "every skill": the conservative reset when the mapping is uncertain. */
export const ALL_SKILLS = '*';

/**
 * Timestamps at microsecond precision. PostgreSQL keeps microseconds; a JS
 * Date keeps milliseconds. Comparing a 48 h boundary at millisecond precision
 * would round the server's answer, so the clock arithmetic here is done in
 * integer microseconds from the text the server returned.
 */
export function toMicros(value: unknown): number {
  if (value instanceof Date) return value.getTime() * 1000;
  if (typeof value === 'number') return value;
  if (typeof value !== 'string') throw new TypeError('not a timestamp: ' + String(value));
  const m = value.match(/^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2}:\d{2})(?:\.(\d{1,6}))?\s*(Z|[+-]\d{2}(?::?\d{2})?)?$/);
  if (!m) throw new TypeError('not a timestamp: ' + value);
  const [, date, time, fraction, zone] = m;
  const fractionMicros = fraction ? Number((fraction + '000000').slice(0, 6)) : 0;
  let offset = zone ?? 'Z';
  if (offset !== 'Z' && /^[+-]\d{2}$/.test(offset)) offset += ':00';
  if (offset !== 'Z' && /^[+-]\d{4}$/.test(offset)) offset = offset.slice(0, 3) + ':' + offset.slice(3);
  const whole = Date.parse(`${date}T${time}${offset}`);
  if (Number.isNaN(whole)) throw new TypeError('not a timestamp: ' + value);
  return whole * 1000 + fractionMicros;
}

export function microsToIso(micros: number): string {
  const ms = Math.floor(micros / 1000);
  const rest = micros - ms * 1000;
  return new Date(ms).toISOString().replace('Z', String(rest).padStart(3, '0') + 'Z');
}
