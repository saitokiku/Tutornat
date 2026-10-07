import { localDate } from "./dates";
import type { EventKind, SchoolEvent } from "./types";

// iCalendar (.ics) in and out. Google Classroom, Google Calendar, Canvas and Schoology all publish
// calendar feeds in this format, so this one reader covers "import my school calendar".

export type IcsEvent = { uid?: string; title: string; date: string; time?: string; description?: string };

const unescape = (s: string) => s.replace(/\\n/gi, "\n").replace(/\\([,;\\])/g, "$1");

function parseWhen(value: string, params: string): { date: string; time?: string } | null {
  // 20261021 (all-day), 20261021T090000 (floating or with TZID — read as local wall time), …Z (UTC).
  const m = /^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?(Z)?)?$/.exec(value.trim());
  if (!m) return null;
  const [, y, mo, d, hh, mi, , z] = m;
  if (!hh || /VALUE=DATE(?!-)/i.test(params)) return { date: `${y}-${mo}-${d}` };
  if (z) {
    const at = new Date(Date.UTC(+y, +mo - 1, +d, +hh, +mi));
    return { date: localDate(at), time: `${String(at.getHours()).padStart(2, "0")}:${String(at.getMinutes()).padStart(2, "0")}` };
  }
  return { date: `${y}-${mo}-${d}`, time: `${hh}:${mi}` };
}

/** Reads VEVENTs from an .ics document. Ignores what it can't read rather than failing the import. */
export function parseIcs(text: string, max = 2000): IcsEvent[] {
  const lines = text.replace(/\r\n?/g, "\n").replace(/\n[ \t]/g, "").split("\n");
  const out: IcsEvent[] = [];
  let cur: Record<string, { value: string; params: string }> | null = null;
  for (const line of lines) {
    if (/^BEGIN:VEVENT$/i.test(line)) cur = {};
    else if (/^END:VEVENT$/i.test(line)) {
      if (cur) {
        const when = cur.DTSTART ? parseWhen(cur.DTSTART.value, cur.DTSTART.params) : cur.DUE ? parseWhen(cur.DUE.value, cur.DUE.params) : null;
        const title = unescape(cur.SUMMARY?.value ?? "").trim();
        if (when && title) out.push({ uid: cur.UID?.value, title: title.slice(0, 200), ...when, description: cur.DESCRIPTION ? unescape(cur.DESCRIPTION.value).slice(0, 500) : undefined });
        if (out.length >= max) break;
      }
      cur = null;
    } else if (cur) {
      const m = /^([A-Z-]+)((?:;[^:]*)?):(.*)$/i.exec(line);
      if (m) cur[m[1].toUpperCase()] = { params: m[2], value: m[3] };
    }
  }
  return out;
}

const KINDS: [EventKind, RegExp][] = [
  ["no-school", /no school|no hay clases|holiday|feriado|vacation|vacaciones|\bbreak\b|teacher (work|in-service)|day off|d[ií]a libre/i],
  ["test", /\btest\b|\bexam\b|examen|midterm|final exam|\bfinal\b|unit assessment|evaluaci[oó]n/i],
  ["quiz", /\bquiz|prueba corta|\bprueba\b|check-?in quiz/i],
  ["project", /project|proyecto|essay|ensayo|presentation|presentaci[oó]n|lab report|informe|science fair|feria/i],
  ["homework", /homework|\bhw\b|tarea|assignment|worksheet|due|entrega|reading log|problems|p\.\s?\d|pages?\s\d|ejercicios/i],
];

export function classify(text: string): EventKind {
  for (const [kind, re] of KINDS) if (re.test(text)) return kind;
  return "event";
}

const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
const fold = (line: string) => line.match(/.{1,74}/g)!.join("\r\n ");

/** An .ics file of school events (all-day unless timed), for adding to a family calendar. */
export function toIcs(events: Pick<SchoolEvent, "id" | "title" | "date" | "time" | "notes" | "kind">[], name = "KaizenEDU"): string {
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+/, "");
  const body = events.flatMap((e) => {
    const d = e.date.replace(/-/g, "");
    const start = e.time ? `DTSTART:${d}T${e.time.replace(":", "")}00` : `DTSTART;VALUE=DATE:${d}`;
    return [
      "BEGIN:VEVENT",
      `UID:${e.id}@kaizenedu.net`,
      `DTSTAMP:${stamp}`,
      start,
      fold(`SUMMARY:${esc(e.title)}`),
      ...(e.notes ? [fold(`DESCRIPTION:${esc(e.notes)}`)] : []),
      `CATEGORIES:${e.kind.toUpperCase()}`,
      "END:VEVENT",
    ];
  });
  return ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//KaizenEDU//Plan//EN", `X-WR-CALNAME:${esc(name)}`, ...body, "END:VCALENDAR", ""].join("\r\n");
}
