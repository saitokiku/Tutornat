import { addDays, localDate } from "./dates";
import { classify } from "./ics";
import type { EventKind } from "./types";

// Pasted syllabus, assignment sheet or teacher email → dated school items for a grown-up to review.
// Deterministic and conservative: a line becomes an item only when it carries a real date. Lines that
// look like schoolwork but have no date are listed as "no date found" — never given an invented one.

export type Found = { title: string; date: string; kind: EventKind; line: string };
export type Intake = { found: Found[]; undated: string[] };

const MONTHS_EN = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
const MONTHS_ES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const monthIndex = (word: string) => {
  const w = word.toLowerCase().slice(0, 3);
  const en = MONTHS_EN.indexOf(w);
  return en >= 0 ? en : MONTHS_ES.indexOf(w);
};

const MONTH_WORD = "(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sept?(?:ember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?|enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre)";

const PATTERNS: { re: RegExp; read: (m: RegExpExecArray) => [number | null, number, number] }[] = [
  // 2026-10-21
  { re: /\b(\d{4})-(\d{1,2})-(\d{1,2})\b/, read: (m) => [+m[1], +m[2] - 1, +m[3]] },
  // October 21, 2026 · Oct. 21st · Oct 21
  { re: new RegExp(`\\b${MONTH_WORD}\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?(?:,?\\s+(\\d{4}))?\\b`, "i"), read: (m) => [m[3] ? +m[3] : null, monthIndex(m[1]), +m[2]] },
  // 21 de octubre (de 2026) · 21 octubre
  { re: new RegExp(`\\b(\\d{1,2})\\s+(?:de\\s+)?${MONTH_WORD}(?:\\s+(?:de\\s+)?(\\d{4}))?\\b`, "i"), read: (m) => [m[3] ? +m[3] : null, monthIndex(m[2]), +m[1]] },
  // 10/21 · 10/21/26 · 10/21/2026 (US order)
  { re: /\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/, read: (m) => [m[3] ? (m[3].length === 2 ? 2000 + +m[3] : +m[3]) : null, +m[1] - 1, +m[2]] },
];

/** A date without a year means the next time that day comes around (allowing items up to 30 days back). */
function resolve(year: number | null, month: number, day: number, today: string): string | null {
  if (month < 0 || month > 11 || day < 1 || day > 31) return null;
  const [ty] = today.split("-").map(Number);
  const pick = (y: number) => {
    const d = new Date(y, month, day, 12);
    return d.getMonth() === month ? localDate(d) : null;
  };
  if (year) return pick(year);
  const thisYear = pick(ty);
  if (!thisYear) return null;
  return thisYear < addDays(today, -30) ? pick(ty + 1) : thisYear;
}

const SCHOOLWORK = /test|exam|quiz|homework|\bhw\b|due|project|essay|worksheet|assignment|reading|lab|chapter|unit|tarea|examen|prueba|proyecto|entrega|lectura|cap[ií]tulo/i;

export function readSchoolText(text: string, today: string, max = 200): Intake {
  const found: Found[] = [];
  const undated: string[] = [];
  for (const raw of text.split(/\r?\n/)) {
    // Strip list markers ("•", "-", "1.", "2)") but not a leading date.
    const line = raw.replace(/^\s*(?:[•*\-–—]+|\d{1,2}[.)](?=\s))\s*/, "").trim();
    if (line.length < 3) continue;
    let hit: { date: string; start: number; end: number } | null = null;
    for (const p of PATTERNS) {
      const m = p.re.exec(line);
      if (!m) continue;
      const date = resolve(...p.read(m), today);
      if (date) {
        hit = { date, start: m.index, end: m.index + m[0].length };
        break;
      }
    }
    if (!hit) {
      if (SCHOOLWORK.test(line) && undated.length < 30) undated.push(line.slice(0, 160));
      continue;
    }
    const title = (line.slice(0, hit.start) + " " + line.slice(hit.end))
      .replace(/\b(mon|tue|wed|thu|fri|sat|sun)[a-z]*\.?,?\s*/gi, "")
      .replace(/\b(lunes|martes|mi[eé]rcoles|jueves|viernes|s[aá]bado|domingo),?\s*/gi, "")
      .replace(/\b(due|on|by|para el|el)\s*$/i, "")
      .replace(/^[\s:,\-–—|]+|[\s:,\-–—|]+$/g, "")
      .replace(/\s{2,}/g, " ")
      .trim();
    if (!title) continue;
    found.push({ title: title.slice(0, 160), date: hit.date, kind: classify(line), line: raw.trim().slice(0, 200) });
    if (found.length >= max) break;
  }
  return { found, undated };
}
