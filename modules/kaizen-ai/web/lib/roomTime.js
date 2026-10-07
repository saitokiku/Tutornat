// How a room's time is written down. PURE — an instant and a zone in, strings
// out — so the DST weeks are pinned by a test instead of by hope, and so the
// server and the browser cannot disagree.
//
// WHY THIS EXISTS (docs/superpowers/specs/2026-09-02-wave2-audit.md)
// Every surface in the product formatted a room's time in the WRONG zone, four
// different ways. `publicSchedule` returned each room's `timezone` on every row
// and not one consumer read it: /tutoring and the landing strip formatted
// server-side, which on Vercel is UTC, so a 6:00 PM Austin room rendered as
// "Tue 11:00 PM"; ScheduleBrowser formatted in the visitor's browser zone, so
// the same room read "4:00 PM" in California. For a business whose entire
// proposition is being in a particular room on a particular evening, the time
// is not a display detail — it is the product.
//
// So: one formatter, and it takes the room's zone as a required argument. There
// is no default and no fallback to the reader's locale, because a silent
// fallback is exactly how the bug happened. A caller with no zone gets the
// club's home zone and says so out loud.

// The operation's home zone. The DB default for a series (0029) and for a
// cohort (0038) is the same string; this is the one place JavaScript names it.
export const CLUB_TIMEZONE = 'America/Chicago';

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const WEEKDAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function zoneOf(timeZone) {
  return typeof timeZone === 'string' && timeZone ? timeZone : CLUB_TIMEZONE;
}

function partsIn(value, timeZone) {
  // `new Date(null)` is the epoch, not an error — so a room with no
  // scheduled_start would render a confident "Wed 6:00 PM" from 1969 rather
  // than nothing. Absent input is rejected before Date ever sees it.
  if (value == null || value === '') return null;
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: zoneOf(timeZone),
    hourCycle: 'h23',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', weekday: 'short',
  });
  const out = {};
  for (const p of fmt.formatToParts(d)) out[p.type] = p.value;
  return {
    year: Number(out.year),
    month: Number(out.month),
    day: Number(out.day),
    hour: Number(out.hour),
    minute: Number(out.minute),
    weekday: WEEKDAYS_SHORT.indexOf(out.weekday),
  };
}

/** "6:00 PM" in the room's own zone. Empty string for an unreadable instant. */
export function roomTime(value, timeZone) {
  const p = partsIn(value, timeZone);
  if (!p) return '';
  return clockFrom(p.hour, p.minute);
}

/** "Thu" / "Thursday" in the room's own zone. */
export function roomDay(value, timeZone, { long = false } = {}) {
  const p = partsIn(value, timeZone);
  if (!p || p.weekday < 0) return '';
  return long ? WEEKDAYS[p.weekday] : WEEKDAYS_SHORT[p.weekday];
}

/** "Thu 6:00 PM" — the form a schedule row uses. */
export function roomWhen(value, timeZone, { long = false } = {}) {
  const day = roomDay(value, timeZone, { long });
  const time = roomTime(value, timeZone);
  return day && time ? `${day} ${time}` : day || time;
}

/** "Thu 4 Sep · 6:00 PM" — the form a confirmation or a reminder uses. */
export function roomDateTime(value, timeZone) {
  const p = partsIn(value, timeZone);
  if (!p) return '';
  const d = value instanceof Date ? value : new Date(value);
  const month = new Intl.DateTimeFormat('en-US', { timeZone: zoneOf(timeZone), month: 'short' }).format(d);
  return `${WEEKDAYS_SHORT[p.weekday]} ${p.day} ${month} · ${clockFrom(p.hour, p.minute)}`;
}

/**
 * A recurring slot, from the SERIES row rather than from an instant:
 * weekday 2 + '18:00' → "Tue 6:00 PM". The series stores a local wall-clock
 * time, so no zone conversion happens here — the stored time is already the
 * time a parent reads off their calendar. The zone is accepted (and returned
 * by `zoneLabel`) only so a surface can disclose it when it matters.
 */
export function slotWhen(weekday, localStartTime, { long = false } = {}) {
  // Same trap as above: Number(null) is 0, a perfectly valid Sunday. A series
  // with no weekday must say nothing, not say Sunday.
  const i = weekday == null || weekday === '' ? NaN : Number(weekday);
  const day = Number.isInteger(i) && i >= 0 && i <= 6 ? (long ? WEEKDAYS[i] : WEEKDAYS_SHORT[i]) : '';
  const [hh, mm] = String(localStartTime || '').split(':');
  const time = clockFrom(Number(hh), Number(mm));
  return day && time ? `${day} ${time}` : day || time;
}

/**
 * The days of a cohort as one phrase: [2, 4] → "Tuesdays and Thursdays".
 * This is the sentence a parent needs and that no row could produce before
 * cohorts existed (0038).
 */
export function cohortDays(weekdays = [], { long = true } = {}) {
  const names = [...new Set(
    (Array.isArray(weekdays) ? weekdays : [])
      .map(Number)
      .filter((n) => Number.isInteger(n) && n >= 0 && n <= 6),
  )]
    .sort((a, b) => a - b)
    .map((n) => (long ? `${WEEKDAYS[n]}s` : WEEKDAYS_SHORT[n]));
  if (!names.length) return '';
  if (names.length === 1) return names[0];
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

/**
 * "Tuesdays and Thursdays, 6:00 PM" — a cohort's whole pattern in one phrase,
 * or every slot spelled out when the evenings differ. Collapsing two different
 * times into one would send a family to the wrong room on the second evening.
 */
export function cohortPattern(slots = []) {
  const list = Array.isArray(slots) ? slots : [];
  if (!list.length) return '';
  const days = cohortDays(list.map((s) => s.weekday));
  const times = [...new Set(list.map((s) => String(s.localStartTime || '')))];
  if (times.length === 1) {
    const one = slotWhen(list[0].weekday, list[0].localStartTime);
    const time = one.split(' ').slice(1).join(' ');
    return days && time ? `${days}, ${time}` : days || time;
  }
  return list.map((s) => slotWhen(s.weekday, s.localStartTime)).join(' · ');
}

/**
 * "Chicago time" — how a zone is named to a person. Only ever shown when the
 * reader might not be in it; a local club talking to local families does not
 * need to caveat its own evenings.
 */
export function zoneLabel(timeZone) {
  const zone = zoneOf(timeZone);
  const city = zone.split('/').pop() || zone;
  return `${city.replaceAll('_', ' ')} time`;
}

/**
 * "CDT" / "CST" — the zone as a calendar or an email writes it, for the given
 * instant so daylight saving is right.
 *
 * `zoneLabel` says "Chicago time", which is the honest phrase for a page whose
 * reader may not know what CDT is. Mail is different: an Austin family reading
 * "Chicago time" for an Austin room reasonably wonders whether we have the room
 * wrong, and every calendar they use already writes the abbreviation. Falls
 * back to the city phrase where a runtime gives no short name.
 */
export function zoneAbbrev(value, timeZone) {
  // Same guard as partsIn: `new Date(null)` is the epoch, not an error.
  if (value == null || value === '') return '';
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const zone = zoneOf(timeZone);
  try {
    const part = new Intl.DateTimeFormat('en-US', { timeZone: zone, timeZoneName: 'short' })
      .formatToParts(d).find((p) => p.type === 'timeZoneName');
    const name = part?.value || '';
    // Some runtimes answer "GMT-5" rather than an abbreviation; the city phrase
    // is more use to a person than an offset.
    return /^[A-Z]{2,5}$/.test(name) ? name : zoneLabel(zone);
  } catch {
    return zoneLabel(zone);
  }
}

function clockFrom(hour, minute) {
  if (!Number.isInteger(hour) || !Number.isInteger(minute)) return '';
  const suffix = hour >= 12 ? 'PM' : 'AM';
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${h12}:${String(minute).padStart(2, '0')} ${suffix}`;
}
