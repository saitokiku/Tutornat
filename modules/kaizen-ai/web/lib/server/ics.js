// Minimal iCalendar generation for session emails — the cheapest no-show
// lever we can pull without a new vendor (SMS is deferred: texting minors
// needs TCPA consent capture + counsel first; docs/LAUNCH_GAPS.md).
//
// Pure string building, RFC 5545's happy path only: one VEVENT, UTC times,
// no recurrence (each materialized room is its own event). Escaping per
// §3.3.11 — backslash, semicolon, comma, newline.

function icsEscape(v) {
  return String(v ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

function icsUtc(dateish) {
  const d = new Date(dateish);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

/**
 * One-event calendar file. Returns { filename, content } (content is the
 * plain .ics text; email.js base64-encodes for the Resend payload), or null
 * if the times are unusable — callers just skip the attachment.
 */
export function sessionIcs({ uid, title, description = '', start, end, url = '' }) {
  const dtStart = icsUtc(start);
  const dtEnd = icsUtc(end || start);
  if (!dtStart || !dtEnd) return null;
  const stamp = icsUtc(new Date());
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Kaizen Academy LLC//Kaizen//EN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${icsEscape(uid || `${dtStart}@kaizenedu.net`)}`,
    `DTSTAMP:${stamp}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:${icsEscape(title || 'Kaizen session')}`,
    ...(description ? [`DESCRIPTION:${icsEscape(description)}`] : []),
    ...(url ? [`URL:${icsEscape(url)}`] : []),
    'END:VEVENT',
    'END:VCALENDAR',
  ];
  return { filename: 'kaizen-session.ics', content: lines.join('\r\n') };
}
