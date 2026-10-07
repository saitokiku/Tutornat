/** Timestamp helpers used by report/rows.ts, as in KaizenEdu `lib/tutor/accounts/rows.ts`; the account mappers are excluded. */

export function toIso(value: string | Date): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

export function toIsoOrNull(value: string | Date | null | undefined): string | null {
  return value == null ? null : toIso(value);
}
