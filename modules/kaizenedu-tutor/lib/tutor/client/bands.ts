/**
 * Age bands on the client. `kaizen.config.ts` is server-only except for
 * `publicConfig`, so the birth-year rule is restated here and pinned to the
 * server rule by tests/tutor/shell-helpers.test.ts.
 */
import type { AgeBand } from '@/kaizen.config';
import type { LearnerStatus, Role } from '@/lib/tutor/contracts';

export type Surface = 'kids' | 'teen' | 'parent';

/**
 * Same rule as `ageBandForBirthYear` (spec R5); null means not creatable.
 * Like the server, this resolves the birth-year ambiguity to the youngest age
 * the year allows, so a 12-year-old with a late birthday is never shown as a
 * teen. The parity test pins this to the server rule.
 */
export function bandForBirthYear(birthYear: number, now = new Date()): AgeBand | null {
  const age = now.getUTCFullYear() - birthYear - 1;
  if (age >= 18) return 'adult';
  if (age >= 13) return '13-17';
  if (age >= 9) return '9-12';
  if (age >= 4) return '4-8';
  return null;
}

export function bandLabel(band: AgeBand | null): string {
  switch (band) {
    case '4-8':
      return 'Ages 4 to 8';
    case '9-12':
      return 'Ages 9 to 12';
    case '13-17':
      return 'Ages 13 to 17';
    case 'adult':
      return 'Adult';
    default:
      return 'Not set';
  }
}

export function isUnder13(band: AgeBand | null): boolean {
  return band === '4-8' || band === '9-12';
}

/**
 * What creating a profile with this band does today (spec D5, D6, R5):
 * under-13 profiles are created locked until the consent stack ships and the
 * operator opens the gate; 4-8 stays locked until Gate 3.
 */
export function profileWillBeLocked(band: AgeBand | null, under13Open: boolean): boolean {
  if (band === '4-8') return true;
  if (band === '9-12') return !under13Open;
  return false;
}

/** Teen profiles sign in with their own login name (spec R5). */
export function needsTeenLogin(band: AgeBand | null): boolean {
  return band === '13-17';
}

/**
 * Which visual mood a learner surface uses (design-system "Surfaces by
 * audience"): the band of the active learner decides, because that is who
 * is looking at the screen; a parent with no learner selected gets the quiet
 * parent mood. The parent app always uses `parent`.
 */
export function surfaceFor(role: Role | null, band: AgeBand | null): Surface {
  if (band === '4-8' || band === '9-12') return 'kids';
  if (band) return 'teen';
  return role === 'parent' ? 'parent' : 'teen';
}

export function learnerStatusLabel(status: LearnerStatus): string {
  switch (status) {
    case 'active':
      return 'Active';
    case 'locked':
      return 'Locked until consent review';
    case 'frozen':
      return 'Frozen';
  }
}
