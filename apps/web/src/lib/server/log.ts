// Structured server logs with personal data scrubbed out: one JSON object per line on stderr/stdout,
// which Vercel's log drains and any error tracker can read. Never logged: request bodies, learner
// names, emails, phone numbers, transcripts, answers, anything typed (titles, topics, queries), secrets.
// Callers pass facts (route, status, counts); scrub() is the second line of defence for anything that
// slips into a message. installConsoleScrub() puts everything else written to console.error and
// console.warn on the server (Next's own `console.error(err)` for an uncaught error included) through
// the same scrubbing.
// No "server-only" import: instrumentation.ts loads this in both the Node and Edge runtimes.

/** Keys whose values are personal or conversational, matched whole. Their values are dropped whatever they hold. */
const DROP_WHOLE = /^(to|from|q|tel|pass|say|lines|learner|child|hash|salt|body|key)$/i;
/**
 * Keys matched by their ending, so learnerName, parentEmail, userMessage, studentAnswer, eventTitle,
 * searchQuery or x-api-key go too (compared without - and _).
 */
const DROP_ENDING =
  /(name|e?mail|phone|address|transcript|messages?|(?<!con)text|prompt|content|notes?|answers?|response|title|goal|topic|query|interests|password|token|secret|apikey|authorization|cookie)$/i;
export const dropsKey = (k: string) => DROP_WHOLE.test(k) || DROP_ENDING.test(k.replace(/[-_]/g, ""));

const EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9-]+(?:\.[A-Z0-9-]+)*\.[A-Z]{2,}/gi;
// Digit runs with phone/card punctuation. Only runs holding 10+ digits are masked, so dates
// (2026-10-07), versions and line:column numbers stay readable.
const DIGIT_RUN = /\+?\(?\d[\d\s().-]{6,}\d/g;
const SECRET = /\b(?:sk-[A-Za-z0-9_-]{8,}|re_[A-Za-z0-9_]{8,}|Bearer\s+[A-Za-z0-9._~+/-]{8,}=*)/g;
// Double, curly and back quotes: where an error quotes its input (JSON.parse quotes the start of the
// text it failed on). Single quotes stay, since property names ('nickname') are worth keeping.
const QUOTED = /"[^"\n]{1,2000}"|“[^”\n]{1,2000}”|`[^`\n]{1,2000}`/g;

const MAX_STRING = 1000;
const MAX_DEPTH = 6;
const MAX_ITEMS = 50;

/** Masks emails, phone and card numbers and secrets in free text, and caps its length. */
export function scrubText(s: string): string {
  const out = s
    .replace(SECRET, "[secret]")
    .replace(EMAIL, (m) => `[email ${m.slice(m.lastIndexOf("@") + 1)}]`)
    .replace(DIGIT_RUN, (m) => ((m.match(/\d/g)?.length ?? 0) >= 10 ? "[number]" : m));
  return out.length > MAX_STRING ? `${out.slice(0, MAX_STRING)}…[${out.length - MAX_STRING} more]` : out;
}

/** For text nobody here wrote (error messages, other code's console output): quoted text is masked too. */
export const scrubFreeText = (s: string) => scrubText(s.replace(QUOTED, "[quoted]"));

/** A path with every query value removed (`/api/know/wiki?q=[redacted]`): queries can hold what a child typed. */
export function scrubPath(path: string): string {
  const i = path.indexOf("?");
  if (i < 0) return scrubText(path);
  const keys = path
    .slice(i + 1)
    .split("&")
    .filter(Boolean)
    .map((pair) => `${pair.split("=")[0]}=[redacted]`);
  return scrubText(path.slice(0, i)) + (keys.length ? `?${keys.join("&")}` : "");
}

/** Error → name, scrubbed message, digest and the top of the stack. Never its other properties or cause. */
function describeError(e: Error & { digest?: unknown; code?: unknown }) {
  return {
    name: e.name,
    message: scrubFreeText(e.message),
    ...(e.digest !== undefined ? { digest: String(e.digest) } : {}),
    ...(typeof e.code === "string" ? { code: e.code } : {}),
    ...(e.stack ? { stack: scrubFreeText(e.stack.split("\n").slice(0, 8).join("\n")) } : {}),
  };
}

/**
 * Deep copy that is safe to log: personal keys dropped, free text masked, depth and size capped,
 * cycles cut. Numbers, booleans and null pass through.
 */
export function scrub(value: unknown, depth = 0, seen = new WeakSet<object>()): unknown {
  if (value === null || typeof value === "number" || typeof value === "boolean") return value;
  if (typeof value === "string") return scrubText(value);
  if (typeof value === "bigint") return value.toString();
  if (typeof value !== "object") return value === undefined ? undefined : `[${typeof value}]`;
  if (seen.has(value)) return "[circular]";
  seen.add(value);
  if (value instanceof Error) return describeError(value);
  if (depth >= MAX_DEPTH) return "[deep]";
  if (Array.isArray(value)) {
    const items = value.slice(0, MAX_ITEMS).map((v) => scrub(v, depth + 1, seen));
    return value.length > MAX_ITEMS ? [...items, `[${value.length - MAX_ITEMS} more]`] : items;
  }
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value).slice(0, MAX_ITEMS)) {
    if (v === undefined) continue;
    out[k] = dropsKey(k) ? "[redacted]" : scrub(v, depth + 1, seen);
  }
  return out;
}

export type Level = "info" | "warn" | "error";
type Writers = Record<Level, (line: string) => void>;

// The console methods as they were before installConsoleScrub() wrapped them, kept on globalThis so
// every copy of this module in the runtime writes its own (already scrubbed) lines through them.
const RAW = Symbol.for("kaizenedu.log.rawConsole");
const writers = (): Writers => ((globalThis as Record<symbol, unknown>)[RAW] as Writers | undefined) ?? { error: (l) => console.error(l), warn: (l) => console.warn(l), info: (l) => console.info(l) };

const lineOf = (level: Level, event: string, fields: Record<string, unknown>, at: Date) => JSON.stringify({ ts: at.toISOString(), level, event, ...(scrub(fields) as Record<string, unknown>) });

/** Writes one structured line. `event` is a fixed name ("request_error", "email_sent"), never user text. */
export function log(level: Level, event: string, fields: Record<string, unknown> = {}, at = new Date()) {
  const line = lineOf(level, event, fields, at);
  writers()[level](line);
  return line;
}

/** One console argument from code we don't control, made safe: errors described, text masked, objects scrubbed. */
function consoleArg(a: unknown): unknown {
  if (typeof a === "string") return scrubFreeText(a);
  return scrub(a);
}

/**
 * Wraps console.error and console.warn so whatever else writes to them on the server (Next logs an
 * uncaught error with `console.error(err)` before onRequestError runs; libraries warn) becomes one
 * scrubbed JSON line ({event: "console", args: […]}). Installed once per runtime from
 * instrumentation.ts register(); returns a function that puts the console back (for tests).
 */
export function installConsoleScrub(): () => void {
  const g = globalThis as Record<symbol, unknown>;
  if (g[RAW]) return () => {};
  const before = { error: console.error, warn: console.warn };
  const raw: Writers = { error: before.error.bind(console), warn: before.warn.bind(console), info: console.info.bind(console) };
  g[RAW] = raw;
  for (const level of ["error", "warn"] as const)
    console[level] = (...args: unknown[]) => raw[level](JSON.stringify({ ts: new Date().toISOString(), level, event: "console", args: args.slice(0, 10).map(consoleArg) }));
  return () => {
    console.error = before.error;
    console.warn = before.warn;
    delete g[RAW];
  };
}

type RequestInfo = { path: string; method: string; headers: Record<string, string | string[] | undefined> };
type RequestContext = { routerKind?: string; routePath?: string; routeType?: string; renderSource?: string; revalidateReason?: string; renderType?: string };

/** For instrumentation.ts onRequestError: what failed and where, with no request body, headers or query values. */
export function logRequestError(err: unknown, request: RequestInfo, context: RequestContext) {
  const id = request.headers["x-vercel-id"] ?? request.headers["x-request-id"];
  return log("error", "request_error", {
    method: request.method,
    path: scrubPath(request.path),
    route: context.routePath,
    routeType: context.routeType,
    renderSource: context.renderSource,
    runtime: process.env.NEXT_RUNTIME,
    requestId: Array.isArray(id) ? id[0] : id,
    error: err instanceof Error ? err : { thrown: typeof err === "string" ? scrubFreeText(err) : typeof err },
  });
}
