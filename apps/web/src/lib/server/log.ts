// Structured server logs with personal data scrubbed out: one JSON object per line on stderr/stdout,
// which Vercel's log drains and any error tracker can read. Never logged: request bodies, learner
// names, emails, phone numbers, transcripts, answers, secrets. Callers pass facts (route, status,
// counts); scrub() is the second line of defence for anything that slips into a message.
// No "server-only" import: instrumentation.ts loads this in both the Node and Edge runtimes.

/** Keys whose values are personal or conversational. Their values are dropped whatever they hold. */
const DROP_KEYS =
  /^(name|nickname|display_?name|first_?name|last_?name|full_?name|learner|child|email|to|from|phone|tel|address|transcript|lines|messages?|text|prompt|content|say|notes?|body|answer|response|password|pass|salt|hash|password_?hash|token|secret|api_?key|authorization|cookie|set-cookie)$/i;

const EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9-]+(?:\.[A-Z0-9-]+)*\.[A-Z]{2,}/gi;
// Digit runs with phone/card punctuation. Only runs holding 10+ digits are masked, so dates
// (2026-10-07), versions and line:column numbers stay readable.
const DIGIT_RUN = /\+?\(?\d[\d\s().-]{6,}\d/g;
const SECRET = /\b(?:sk-[A-Za-z0-9_-]{8,}|re_[A-Za-z0-9_]{8,}|Bearer\s+[A-Za-z0-9._~+/-]{8,}=*)/g;

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

/** Error → name, scrubbed message, digest and the top of the stack. */
function describeError(e: Error & { digest?: unknown; code?: unknown }) {
  return {
    name: e.name,
    message: scrubText(e.message),
    ...(e.digest !== undefined ? { digest: String(e.digest) } : {}),
    ...(typeof e.code === "string" ? { code: e.code } : {}),
    ...(e.stack ? { stack: scrubText(e.stack.split("\n").slice(0, 8).join("\n")) } : {}),
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
    out[k] = DROP_KEYS.test(k) ? "[redacted]" : scrub(v, depth + 1, seen);
  }
  return out;
}

export type Level = "info" | "warn" | "error";

/** Writes one structured line. `event` is a fixed name ("request_error", "email_sent"), never user text. */
export function log(level: Level, event: string, fields: Record<string, unknown> = {}, at = new Date()) {
  const line = JSON.stringify({ ts: at.toISOString(), level, event, ...(scrub(fields) as Record<string, unknown>) });
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.info(line);
  return line;
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
    requestId: Array.isArray(id) ? id[0] : id,
    error: err instanceof Error ? err : { thrown: typeof err === "string" ? err : typeof err },
  });
}
