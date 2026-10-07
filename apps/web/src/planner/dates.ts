// Local calendar days as "YYYY-MM-DD". Arithmetic goes through Date at noon so a daylight-saving
// change can never move a day.

export function localDate(at: number | Date): string {
  const d = new Date(at);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function fromLocalDate(day: string): Date {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(y, m - 1, d, 12);
}

export function addDays(day: string, n: number): string {
  const d = fromLocalDate(day);
  d.setDate(d.getDate() + n);
  return localDate(d);
}

/** Whole days from `a` to `b` (b − a). */
export function daysBetween(a: string, b: string): number {
  return Math.round((fromLocalDate(b).getTime() - fromLocalDate(a).getTime()) / 864e5);
}

/** Monday of the week containing `day`. */
export function weekStart(day: string): string {
  const d = fromLocalDate(day);
  return addDays(day, -((d.getDay() + 6) % 7));
}

export const isDay = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(fromLocalDate(s).getTime());
