import { cachedJson } from "./fetch";

// Common Core text from the Common Standards Project (open data). Maps a code like 4.NF.A.1 to
// what it actually says, so a parent can read the standard behind a skill.

const API = "https://api.commonstandardsproject.com/api/v1";
const CCSS = "67810E9EF6944F9383DCC602A3484C23";

type Jurisdiction = { data: { standardSets: { id: string; title: string; subject: string; educationLevels: string[] }[] } };
type SetData = { data: { standards: Record<string, { statementNotation?: string; description?: string; depth?: number }> } };

export type Standard = { code: string; text: string; subject: string; grade: string; source: "Common Core State Standards" };

/** Grade from a CCSS code: "4.NF.A.1" → "04", "K.CC.B.5" → "K", "RF.1.3a" → "01", "A-REI.B.3" → high school. */
function gradeOf(code: string): string | null {
  const m = /^([K1-9])\./.exec(code) ?? /^[A-Z]+\.([K1-9])\./.exec(code);
  if (m) return m[1] === "K" ? "K" : `0${m[1]}`;
  if (/^[A-Z]-[A-Z]+/.test(code)) return "09";
  return null;
}

export async function standardText(code: string): Promise<Standard | null> {
  const grade = gradeOf(code);
  if (!grade) return null;
  const subject = /^(RF|RL|RI|W|SL|L)\./.test(code) || /^[K1-9]\.(RF|RL|RI|W|SL|L)/.test(code) ? "English Language Arts" : "Mathematics";
  const j = await cachedJson<Jurisdiction>(`${API}/jurisdictions/${CCSS}`, { ttlMs: 7 * 24 * 3600_000 });
  const sets = j.data.standardSets.filter((s) => s.subject.startsWith(subject.split(" ")[0]) && s.educationLevels.includes(grade === "K" ? "K" : grade) || (grade === "09" && s.educationLevels.some((l) => ["09", "10", "11", "12"].includes(l)) && s.subject.startsWith(subject.split(" ")[0])));
  for (const set of sets.slice(0, 3)) {
    const data = await cachedJson<SetData>(`${API}/standard_sets/${set.id}`, { ttlMs: 7 * 24 * 3600_000, maxBytes: 3_000_000 });
    const hit = Object.values(data.data.standards).find((s) => s.statementNotation?.replace(/^CCSS\.(Math|ELA-Literacy)\.(Content\.)?/, "") === code);
    if (hit?.description) return { code, text: hit.description, subject, grade: grade === "K" ? "K" : String(Number(grade)), source: "Common Core State Standards" };
  }
  return null;
}
