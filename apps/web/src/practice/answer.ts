import { equivalent, isExpanded, isFactored, isSimplified, parse } from "./expr";
import { gcd } from "./rng";
import type { Answer, ItemBody } from "./types";

// Deterministic answer checking. A model never decides whether a practice answer is right.
// `form` failures ("right amount, not in simplest form") are reported separately so feedback can say
// exactly what to fix; they still count as not correct.

export type Verdict = { correct: boolean; form?: "simplest" | "factored" | "expanded" | "simplified" | "remainder" };

export type ParsedNumber = { value: number; n?: number; d?: number };

/** Reads what a learner typed as a number: 12, -3, 0.5, .5, 1,200, 3/4, 1 1/2, -2/3, x = 4. */
export function parseNumber(raw: string): ParsedNumber | null {
  let s = raw
    .trim()
    .replace(/[−–]/g, "-")
    .replace(/^[a-z]\s*=\s*/i, "")
    .replace(/\s+/g, " ");
  if (!s) return null;
  // Thousands separators only when followed by exactly three digits.
  s = s.replace(/(\d),(?=\d{3}(\D|$))/g, "$1");
  let m = /^(-)?(\d+) (\d+)\/(\d+)$/.exec(s);
  if (m) {
    const [whole, n, d] = [Number(m[2]), Number(m[3]), Number(m[4])];
    if (d === 0) return null;
    const sign = m[1] ? -1 : 1;
    return { value: sign * (whole + n / d), n: sign * (whole * d + n), d };
  }
  m = /^(-)?(\d+)\s?\/\s?(\d+)$/.exec(s);
  if (m) {
    const d = Number(m[3]);
    if (d === 0) return null;
    const n = (m[1] ? -1 : 1) * Number(m[2]);
    return { value: n / d, n, d };
  }
  m = /^-?(\d+\.?\d*|\.\d+)$/.exec(s);
  if (m) return { value: Number(s) };
  return null;
}

const close = (a: number, b: number) => Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(a), Math.abs(b));

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\s*\/\s*/g, "/")
    .replace(/[^\p{L}\p{N}'/ ]/gu, "")
    .replace(/\s+/g, " ")
    .trim();

/**
 * A clock time the way the clock pad writes it: hour without a leading zero, two-digit minutes.
 * "03:05", "3.05" and "3h05" all read as "3:05"; anything else is null.
 */
export function normTime(raw: string): string | null {
  const m = /^\s*0*(\d{1,2})\s*[:.h]\s*(\d{2})\s*$/i.exec(raw);
  if (!m) return null;
  const h = Number(m[1]), min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return `${h}:${m[2]}`;
}

export function check(answer: Answer, response: string | number): Verdict {
  if (answer.kind === "choice") return { correct: response === answer.index };
  const text = String(response).trim();
  if (!text) return { correct: false };

  switch (answer.kind) {
    case "number": {
      const p = parseNumber(text);
      if (!p) return { correct: false };
      const tol = answer.tolerance ?? 0;
      return { correct: tol ? Math.abs(p.value - answer.value) <= tol : close(p.value, answer.value) };
    }
    case "fraction": {
      const p = parseNumber(text);
      if (!p) return { correct: false };
      if (!close(p.value, answer.n / answer.d)) return { correct: false };
      if (!answer.simplest) return { correct: true };
      // A whole number is already in simplest form; a fraction must be reduced.
      if (p.d === undefined) return Number.isInteger(p.value) ? { correct: true } : { correct: false, form: "simplest" };
      const whole = /^-?\d+ \d+\/\d+$/.test(text.replace(/[−–]/g, "-"));
      const n = whole ? Math.abs(p.n!) % p.d : Math.abs(p.n!);
      return gcd(n, p.d) === 1 && p.d !== 1 ? { correct: true } : { correct: false, form: "simplest" };
    }
    case "remainder": {
      const m = /^(\d+)\s*(?:r|R|rem|remainder|resto)?\s*(\d+)?$/.exec(text.replace(/\s+/g, " ").trim());
      if (!m) return { correct: false };
      const q = Number(m[1]), r = Number(m[2] ?? 0);
      if (q === answer.q && r === answer.r) return { correct: true };
      return { correct: false, form: q === answer.q && r !== answer.r ? "remainder" : undefined };
    }
    case "set": {
      const parts = text
        .replace(/[−–]/g, "-")
        .split(/\s*(?:,|;|\bor\b|\bo\b|\band\b|\by\b)\s*/i)
        .filter(Boolean)
        .map(parseNumber);
      if (parts.some((p) => !p)) return { correct: false };
      const got = parts.map((p) => p!.value).sort((a, b) => a - b);
      const want = [...new Set(answer.values)].sort((a, b) => a - b);
      const uniq = got.filter((v, i) => i === 0 || !close(v, got[i - 1]));
      return { correct: uniq.length === want.length && uniq.every((v, i) => close(v, want[i])) };
    }
    case "pair": {
      const nums = text.replace(/[−–]/g, "-").match(/-?\d+(?:\.\d+)?(?:\/\d+)?/g);
      if (!nums || nums.length !== 2) return { correct: false };
      const [x, y] = nums.map((n) => parseNumber(n)!.value);
      return { correct: close(x, answer.x) && close(y, answer.y) };
    }
    case "expr": {
      const rhs = text.includes("=") ? text.slice(text.lastIndexOf("=") + 1) : text;
      const got = parse(rhs), want = parse(answer.expr);
      if (!got || !want || !equivalent(got, want)) return { correct: false };
      if (answer.form === "factored" && !isFactored(got)) return { correct: false, form: "factored" };
      if (answer.form === "expanded" && (!isExpanded(rhs) || !isSimplified(got, want))) return { correct: false, form: "expanded" };
      if (answer.form === "simplified" && !isSimplified(got, want)) return { correct: false, form: "simplified" };
      return { correct: true };
    }
    case "text": {
      // Times compare as times ("03:05" is "3:05", "305" is not a time); words compare without case,
      // accents or punctuation.
      const time = normTime(text);
      return {
        correct: answer.accept.some((a) => {
          const want = a.includes(":") ? normTime(a) : null;
          return want ? want === time : norm(a) === norm(text);
        }),
      };
    }
  }
}

const fracText = (n: number, d: number) => {
  const g = gcd(n, d);
  const [a, b] = [n / g, d / g];
  return b === 1 ? String(a) : `${a}/${b}`;
};

/** The correct answer written the way a learner would type it (used for "show me" and in tests). */
export function answerText(answer: Answer, choices?: { label: string }[]): string {
  switch (answer.kind) {
    case "number":
      return String(answer.value);
    case "fraction":
      return fracText(answer.n, answer.d);
    case "choice":
      return choices?.[answer.index]?.label ?? String(answer.index);
    case "text":
      return (answer.accept[0].includes(":") && normTime(answer.accept[0])) || answer.accept[0];
    case "expr":
      return answer.expr;
    case "set":
      return answer.values.join(", ");
    case "pair":
      return `(${answer.x}, ${answer.y})`;
    case "remainder":
      return answer.r ? `${answer.q} R ${answer.r}` : String(answer.q);
  }
}

/** A tagged wrong value read as an answer of the same kind, so the checker's own rules decide a match. */
function asAnswer(like: Answer, value: string): Answer | null {
  const v = value.trim();
  switch (like.kind) {
    case "number": {
      const p = parseNumber(v);
      return p ? { kind: "number", value: p.value, tolerance: like.tolerance } : null;
    }
    case "fraction": {
      const p = parseNumber(v);
      return p ? { kind: "fraction", n: p.n ?? p.value, d: p.d ?? 1 } : null;
    }
    case "text":
      return { kind: "text", accept: [v] };
    case "expr":
      return { kind: "expr", expr: v };
    case "remainder": {
      const m = /^(\d+)(?:\s*(?:r|R|rem|remainder|resto)\s*(\d+))?$/.exec(v);
      return m ? { kind: "remainder", q: Number(m[1]), r: Number(m[2] ?? 0) } : null;
    }
    case "set": {
      const parts = v.replace(/[−–]/g, "-").split(/\s*[,;]\s*/).map(parseNumber);
      return parts.every(Boolean) ? { kind: "set", values: parts.map((p) => p!.value) } : null;
    }
    case "pair": {
      const nums = v.replace(/[−–]/g, "-").match(/-?\d+(?:\.\d+)?(?:\/\d+)?/g);
      return nums?.length === 2 ? { kind: "pair", x: parseNumber(nums[0])!.value, y: parseNumber(nums[1])!.value } : null;
    }
    case "choice":
      return null;
  }
}

/**
 * The misconception a wrong response shows: the `why` of the chosen choice (response = its index), or
 * of a tagged wrong value the response equals under the checker's own rules ("10/24" matches "5/12",
 * "03:15" matches "3:15"). Undefined for a right answer or a miss nobody tagged.
 */
export function misconceptionOf(item: Pick<ItemBody, "answer" | "choices" | "wrong">, response: string | number): string | undefined {
  if (check(item.answer, response).correct) return undefined;
  if (item.answer.kind === "choice") return typeof response === "number" ? item.choices?.[response]?.why : undefined;
  const text = String(response);
  if (!text.trim()) return undefined;
  return item.wrong?.find((w) => {
    const as = asAnswer(item.answer, w.value);
    return as !== null && check(as, text).correct;
  })?.why;
}
