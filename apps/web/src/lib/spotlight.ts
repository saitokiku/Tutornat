// Spotlight: the tutor points at something on screen, the way a person points with a finger. The
// element glows, a short caption says why, and if it is off screen the learner is shown which way.
//
// Targets are ids only. Screens mark the places a tutor points at most with data-spot="<id>"
// (spotAttr). Anything else on screen — any visible control or heading — gets a stable auto id from
// its role and accessible name, so the AI can still say "tap this". Nothing from outside ever passes a
// CSS selector; every id is validated against SPOT_ID first.
//
// The engine is a tiny client store (like lib/store.ts; components read it with useSpotlight from
// components/spotlight/hooks.ts). SpotlightLayer draws whatever is lit. No React and no "use client"
// here: lib/ai/spot-tool.ts imports this into the server route for the id rule. On the server nothing
// runs; in a browser the only thing done on load is noting keystrokes in text fields (see typing()).

/* ------------------------------------------------------------------ ids */

export const SPOT_ID = /^[a-z0-9][a-z0-9.-]{0,63}$/;
export const isSpotId = (id: unknown): id is string => typeof id === "string" && SPOT_ID.test(id);

/** Marks an element as a spot target: `<button {...spotAttr("practice.hint")}>`. `label` names it when it has no text (an SVG part). */
export function spotAttr(id: string, label?: string): { "data-spot"?: string; "data-spot-label"?: string } {
  if (!isSpotId(id) || id.startsWith("auto.")) {
    if (process.env.NODE_ENV !== "production") console.error(`spotAttr: "${id}" is not a spot id (lowercase dotted, not auto.*)`);
    return {};
  }
  return label ? { "data-spot": id, "data-spot-label": label } : { "data-spot": id };
}

/* ------------------------------------------------------------------ names */

const NAME_MAX = 60;
/** Rewrites text before it leaves the device. `names` (slugged) lets the lists drop anything a name still hides in. */
export type Scrub = ((text: string) => string) & { names?: readonly string[] };

let defaultScrub: Scrub | null = null;

/** Sets the scrub every spot list and lookup uses (auto ids are built from scrubbed names, so both must agree). */
export function setSpotScrub(fn: Scrub | null) {
  defaultScrub = fn;
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const fold = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "");

/** One character of a name as a pattern over decomposed text: either case, any accents after it. */
function letter(c: string, upperOnly = false): string {
  const lo = c.toLowerCase(), up = c.toUpperCase();
  if (lo === up || lo.length !== 1 || up.length !== 1) return `${escapeRe(c)}\\p{M}*`;
  return `${upperOnly ? up : `[${lo}${up}]`}\\p{M}*`;
}

/**
 * A scrub that replaces these names (the learner's nickname, a grown-up's display name) wherever they
 * appear: each name whole and each word of it ("Maria Lopez" also scrubs "Maria"), ignoring case and
 * accents, as a whole word or glued on in camel case or to digits ("AdaGrade", "Ada3") — but not inside
 * another word ("Adam" stays).
 */
export function scrubNames(names: (string | null | undefined)[], replacement = "[name]"): Scrub {
  const words = names.flatMap((n) => {
    const whole = fold(n?.normalize("NFC").trim() ?? "");
    return [whole, ...whole.split(/[\s\-‐]+/)];
  });
  const list = [...new Set(words.filter((w) => w.length >= 2))].sort((a, b) => b.length - a.length);
  if (!list.length) return (s) => s;
  const any = list.map((w) => [...w].map((c) => letter(c)).join("")).join("|");
  const camel = list.map((w) => { const [first, ...rest] = [...w]; return letter(first, true) + rest.map((c) => letter(c)).join(""); }).join("|");
  // Starts at a word boundary, or a lower-to-upper (or digit-to-letter) seam; ends at one.
  const re = new RegExp(`(?:(?<![\\p{L}\\p{M}])(?:${any})|(?<=[\\p{Ll}\\p{N}]\\p{M}*)(?:${camel}))(?:(?![\\p{L}\\p{M}])|(?<=\\p{Ll}\\p{M}*)(?=\\p{Lu}))`, "gu");
  const fn: Scrub = (s) => s.normalize("NFD").replace(re, replacement).normalize("NFC");
  fn.names = list.map((w) => slug(w, 64)).filter((w) => w.length >= 4);
  return fn;
}

// Never read for a name: what is typed in a field is the learner's.
const NO_TEXT = /^(script|style|template|input|textarea|select|option|datalist)$/;
const ENTRY_ROLE = /^(textbox|searchbox|combobox|spinbutton)$/;
const isEditable = (e: Element) => (e as HTMLElement).isContentEditable === true || /^(|true|plaintext-only)$/.test(e.getAttribute("contenteditable") ?? "-");

/**
 * Visible text of a subtree as assistive tech reads it: skips aria-hidden parts and form fields, uses a
 * part's aria-label in place of its text. Every element is its own run of words: JSX drops the spaces
 * between <span>Ada</span><span>Grade 3</span>, and a name glued to its neighbour would slip past the scrub.
 */
function textOf(el: Element): string {
  let out = "";
  const walk = (node: Node) => {
    for (const c of Array.from(node.childNodes)) {
      if (c.nodeType === 3) out += c.nodeValue ?? "";
      else if (c.nodeType === 1) {
        const e = c as Element;
        if (e.getAttribute("aria-hidden") === "true" || e.hasAttribute("hidden") || NO_TEXT.test(e.localName) || isEditable(e) || ENTRY_ROLE.test(e.getAttribute("role") ?? "")) continue;
        const label = e.getAttribute("aria-label");
        out += " ";
        if (label) out += label;
        else walk(e);
        out += " ";
      }
    }
  };
  walk(el);
  return out;
}

const FIELD = "input, select, textarea";

/** Accessible name, simplified: labelledby, aria-label, a field's labels, text, title. Never a field's value. */
function accessibleName(el: Element): string {
  const by = el.getAttribute("aria-labelledby");
  if (by) {
    const s = by
      .split(/\s+/)
      .map((id) => el.ownerDocument.getElementById(id))
      .map((r) => (r ? textOf(r) : ""))
      .join(" ")
      .trim();
    if (s) return s;
  }
  const label = el.getAttribute("aria-label")?.trim();
  if (label) return label;
  const field = el.matches(FIELD);
  if (field) {
    const labels = (el as HTMLInputElement).labels;
    const s = labels ? Array.from(labels).map(textOf).join(" ").trim() : "";
    if (s) return s;
    if (el instanceof HTMLInputElement && /^(button|submit|reset)$/.test(el.type) && el.value) return el.value;
    const placeholder = el.getAttribute("placeholder")?.trim();
    if (placeholder) return placeholder;
  }
  // What someone typed is theirs: entry fields are named by their labels only.
  const entry = field || isEditable(el) || ENTRY_ROLE.test(el.getAttribute("role") ?? "");
  if (!entry) {
    const text = textOf(el).trim();
    if (text) return text;
  }
  const title = el.getAttribute("title") ?? Array.from(el.children).find((c) => c.localName === "title")?.textContent;
  return title?.trim() ?? "";
}

function clip(s: string): string {
  if (s.length <= NAME_MAX) return s;
  return `${s.slice(0, NAME_MAX - 1).replace(/[\uD800-\uDBFF]$/, "")}…`;
}

/** What a spot is called in the list the tutor sees: data-spot-label, else its accessible name; scrubbed, at most 60 characters. */
export function spotName(el: Element, scrub: Scrub | null = defaultScrub): string {
  // A visually hidden field lit through its label (see litElement) is named as the field.
  const named = el instanceof HTMLLabelElement && el.control && !el.hasAttribute("data-spot") ? el.control : el;
  let s = (named.getAttribute("data-spot-label") || accessibleName(named)).replace(/\s+/g, " ").trim();
  if (scrub) s = scrub(s).replace(/\s+/g, " ").trim();
  return clip(s);
}

/** Backstop: a name the scrub missed but whose letters still show in the text (e.g. split by markup). */
const leaks = (name: string, scrub: Scrub | null) => !!scrub?.names?.some((n) => slug(name, 200).replace(/-/g, "").includes(n.replace(/-/g, "")));

/* ------------------------------------------------------------------ targets */

const SKIP = '[hidden], [inert], [aria-hidden="true"], [data-spot-layer]';
const CONTROL = 'button, a[href], input:not([type="hidden"]), select, textarea, [role="button"], [role="tab"], [role="link"], [role="checkbox"], [role="radio"], [role="slider"]';
const HEADING = 'h1, h2, h3, h4, h5, h6, [role="heading"]';

type VisibilityOptions = { opacityProperty?: boolean; visibilityProperty?: boolean; checkOpacity?: boolean; checkVisibilityCSS?: boolean };

/**
 * On the page and perceivable: connected, not hidden/inert/aria-hidden, not invisible, and with something
 * to see — not zero-size, not visually hidden (Tailwind's sr-only: 1×1 and clipped). A 0-wide tick line
 * still counts: it has height.
 */
export function isShown(el: Element): boolean {
  if (!el.isConnected || el.closest(SKIP)) return false;
  const r = el.getBoundingClientRect();
  if (r.width <= 1 && r.height <= 1) return false;
  const check = (el as Element & { checkVisibility?: (o: VisibilityOptions) => boolean }).checkVisibility;
  if (typeof check === "function" && !check.call(el, { opacityProperty: true, visibilityProperty: true, checkOpacity: true, checkVisibilityCSS: true })) return false;
  const cs = getComputedStyle(el);
  return cs.visibility !== "hidden" && !/^rect\(0(px)?,? 0(px)?,? 0(px)?,? 0(px)?\)$/.test(cs.clip) && cs.clipPath !== "inset(50%)";
}

/** What to light for a target: itself when shown; for a visually hidden field (a styled radio, a file input), its shown label. */
function litElement(el: Element): Element | null {
  if (isShown(el)) return el;
  if (!el.isConnected || el.closest(SKIP) || !el.matches(FIELD)) return null;
  return Array.from((el as HTMLInputElement).labels ?? []).find(isShown) ?? null;
}

function roleOf(el: Element): string {
  const explicit = el.getAttribute("role")?.trim().split(/\s+/)[0]?.toLowerCase().replace(/[^a-z]/g, "");
  if (explicit) return explicit.slice(0, 12);
  const tag = el.localName;
  if (/^h[1-6]$/.test(tag)) return "heading";
  if (tag === "a") return "link";
  if (tag === "button") return "button";
  if (tag === "select") return "combobox";
  if (tag === "textarea") return "textbox";
  if (tag === "input") {
    const type = (el as HTMLInputElement).type;
    if (type === "checkbox" || type === "radio") return type;
    if (type === "range") return "slider";
    if (/^(button|submit|reset|image)$/.test(type)) return "button";
    return "textbox";
  }
  return "control";
}

function slug(s: string, max: number): string {
  return s
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, max)
    .replace(/-+$/, "");
}

type Found = { id: string; el: Element; name: string };

function explicitTargets(scrub: Scrub | null): Found[] {
  const seen = new Set<string>();
  const out: Found[] = [];
  for (const el of Array.from(document.querySelectorAll("[data-spot]"))) {
    const id = el.getAttribute("data-spot") ?? "";
    if (!isSpotId(id) || id.startsWith("auto.") || seen.has(id)) continue;
    const lit = litElement(el);
    if (!lit) continue;
    seen.add(id);
    const name = spotName(el, scrub);
    out.push({ id, el: lit, name: leaks(name, scrub) ? "" : name });
  }
  return out;
}

/** Every visible, named control and heading in page order, each with its auto id. Numbering runs over the whole page so ids stay stable. */
function autoTargets(scrub: Scrub | null): Found[] {
  const used = new Set<string>();
  const out: Found[] = [];
  for (const el of Array.from(document.querySelectorAll(`${CONTROL}, ${HEADING}, [tabindex]`))) {
    if (el.hasAttribute("data-spot") || el.closest("[data-spot-ignore]")) continue;
    if (!el.matches(CONTROL) && !el.matches(HEADING) && !(Number(el.getAttribute("tabindex")) >= 0)) continue;
    // A heading inside a link, a span inside a button: the outer control is the thing to point at.
    if (el.parentElement?.closest(CONTROL)) continue;
    const lit = litElement(el);
    if (!lit) continue;
    const name = spotName(el, scrub);
    // The id is built from the scrubbed name, so it is as clean as the name; a name that still leaks is left out.
    if (!name || leaks(name, scrub)) continue;
    const prefix = `auto.${roleOf(el)}.`;
    const base = prefix + (slug(name, 64 - prefix.length - 4) || "item");
    let id = base;
    for (let n = 2; used.has(id); n++) id = `${base}-${n}`;
    used.add(id);
    out.push({ id, el: lit, name });
  }
  return out;
}

export type SpotInfo = { id: string; name: string };

/**
 * What the tutor can point at right now: marked targets first, then every visible control and heading,
 * each half on screen first, capped. Names are scrubbed (setSpotScrub or opts.scrub) before they or
 * the auto ids built from them leave this function.
 */
export function visibleSpots(opts: { cap?: number; scrub?: Scrub | null } = {}): SpotInfo[] {
  if (typeof document === "undefined") return [];
  const scrub = opts.scrub === undefined ? defaultScrub : opts.scrub;
  const vw = window.innerWidth, vh = window.innerHeight;
  const onScreen = (f: Found) => {
    const r = f.el.getBoundingClientRect();
    return r.bottom > 0 && r.right > 0 && r.top < vh && r.left < vw;
  };
  const firstOnScreen = (list: Found[]) => [...list.filter(onScreen), ...list.filter((f) => !onScreen(f))];
  return [...firstOnScreen(explicitTargets(scrub)), ...firstOnScreen(autoTargets(scrub))]
    .slice(0, opts.cap ?? 60)
    .map(({ id, name }) => ({ id, name }));
}

/** The element an id names, by the same rules as visibleSpots, or null (unknown, invalid or hidden). */
export function resolveSpot(id: string, opts: { scrub?: Scrub | null } = {}): Element | null {
  if (typeof document === "undefined" || !isSpotId(id)) return null;
  if (id.startsWith("auto.")) return autoTargets(opts.scrub === undefined ? defaultScrub : opts.scrub).find((f) => f.id === id)?.el ?? null;
  // Safe as a selector: SPOT_ID allows only [a-z0-9.-].
  for (const el of Array.from(document.querySelectorAll(`[data-spot="${id}"]`))) {
    const lit = litElement(el);
    if (lit) return lit;
  }
  return null;
}

/* ------------------------------------------------------------------ honesty guard */

const guards = new Set<readonly string[]>();

function guardedBy(el: Element): boolean {
  for (const list of guards)
    for (const id of list) {
      const hits = id.startsWith("auto.") ? [resolveSpot(id)] : Array.from(document.querySelectorAll(`[data-spot="${id}"]`)).flatMap((e) => [e, litElement(e)]);
      if (hits.some((g) => g && (g === el || g.contains(el)))) return true;
    }
  return false;
}

/**
 * Makes these targets (and anything inside them) unpointable until released: the place an answer is
 * given (see answerSpots in lib/spot-hints.ts). Spot requests for them quietly fail. Never remove them
 * from the visible list — a missing choice would tell the model which one is right.
 */
export function guardSpots(ids: readonly string[]): () => void {
  const list = ids.filter(isSpotId);
  guards.add(list);
  if (live && guardedBy(live.target)) clearSpot();
  return () => {
    guards.delete(list);
  };
}

/* ------------------------------------------------------------------ what can be seen */

export type View = { left: number; top: number; right: number; bottom: number };
type Bar = { el: Element; edge: number } | null;
export type Bars = { top: Bar; bottom: Bar };

/**
 * A fixed or sticky bar across the top or bottom of the screen: the phone tab bar, the sticky practice
 * header, or a sheet anchored to the bottom (the tutor drawer on phones), whatever its height.
 */
function barAt(y: number): Bar {
  if (typeof document.elementsFromPoint !== "function") return null;
  const vw = window.innerWidth, vh = window.innerHeight;
  const hit = document.elementsFromPoint(vw / 2, y).find((e) => !e.closest("[data-spot-layer]"));
  for (let n: Element | null = hit ?? null; n && n !== document.body && n !== document.documentElement; n = n.parentElement) {
    const pos = getComputedStyle(n).position;
    if (pos !== "fixed" && pos !== "sticky") continue;
    const r = n.getBoundingClientRect();
    const sheet = y > vh / 2 && r.bottom >= vh - 2 && r.top > vh * 0.1;
    if (r.width < vw * 0.6 || (r.height > vh * 0.3 && !sheet)) return null;
    return { el: n, edge: y < vh / 2 ? r.bottom : r.top };
  }
  return null;
}

/** What covers the top and bottom edges of the screen right now (two hit tests; cheap enough per frame). */
export const edgeBars = (): Bars => ({ top: barAt(1), bottom: barAt(window.innerHeight - 1) });

/** The part of the viewport where el can be seen: cut down by every clipping or scrolling ancestor. */
export function clipBox(el: Element): View {
  const box = { left: 0, top: 0, right: window.innerWidth, bottom: window.innerHeight };
  for (let p = el.parentElement; p && p !== document.body && p !== document.documentElement; p = p.parentElement) {
    const cs = getComputedStyle(p);
    if (cs.overflowX !== "visible" || cs.overflowY !== "visible") {
      const r = p.getBoundingClientRect();
      box.left = Math.max(box.left, r.left);
      box.top = Math.max(box.top, r.top);
      box.right = Math.min(box.right, r.right);
      box.bottom = Math.min(box.bottom, r.bottom);
    }
    if (cs.position === "fixed") break;
  }
  return box;
}

/** The screen less the bars el is not part of (a tab in the tab bar is not hidden by it). */
export function barView(el: Element, bars: Bars = edgeBars()): View {
  const top = bars.top && !bars.top.el.contains(el) ? bars.top.edge : 0;
  const bottom = bars.bottom && !bars.bottom.el.contains(el) ? bars.bottom.edge : window.innerHeight;
  return { left: 0, top, right: window.innerWidth, bottom };
}

/** Where el can be seen: its clip box, less the bars. What both scrolling and drawing go by. */
export function seenView(el: Element, bars: Bars = edgeBars()): View {
  const c = clipBox(el), b = barView(el, bars);
  return { left: c.left, right: c.right, top: Math.max(c.top, b.top), bottom: Math.min(c.bottom, b.bottom) };
}

/* ------------------------------------------------------------------ engine */

export type SpotCue = "glow" | "point";
export type SpotStep = { id: string; say: string };
export type SpotOptions = {
  /** The caption: why this matters, in the tutor's words. */
  say?: string;
  /** glow = a ring around it (default); point = an arrow at it, for small things a ring would crowd. */
  cue?: SpotCue;
  /** Move keyboard focus to the target. Off by default: pointing never steals focus. */
  focus?: boolean;
  /**
   * Clears itself after this long. Default: a caption stays until the learner closes it, uses the
   * target, or something new is lit (reading time is theirs); a bare glow or arrow clears after SPOT_MS.
   * 0 or Infinity keeps it until dismissed. Steps never time out.
   */
  ms?: number;
  /** More places to visit after this one, as a walkthrough with Back / Next. */
  steps?: SpotStep[];
  /** Dim the rest of the page. Default: on for walkthroughs, off for a single spot. */
  dim?: boolean;
};

export type Spotlight = {
  /** One per spot()/spotSteps() call. */
  session: number;
  /** Bumps when the same spot re-pulses or its element is replaced. */
  nonce: number;
  id: string;
  target: Element;
  say?: string;
  cue: SpotCue;
  dim: boolean;
  /** The whole walkthrough, or null for a single spot. */
  steps: SpotStep[] | null;
  index: number;
  /** The learner's age band (setSpotBand), when the app has set one. */
  band?: string;
};

/** How long a bare glow or arrow (no caption) stays. */
export const SPOT_MS = 8000;
const SAY_MAX = 160;
/** A key pressed in a text field this recently means the learner is typing: don't scroll under them. */
const TYPING_MS = 1500;

let live: Spotlight | null = null;
let sessions = 0;
let band: string | undefined;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((fn) => fn());

let timer: ReturnType<typeof setTimeout> | undefined;
let duration: number | null = null;
let remaining = 0;
let startedAt = 0;
let held = false;
let focusing = false;
let observer: MutationObserver | null = null;
/** A walkthrough step the learner just used; the move to the next step is on its way. */
let advancing: { session: number; index: number } | null = null;
let keyAt = -Infinity;

export const currentSpot = () => live;
export function subscribeSpot(fn: () => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

/** The learner's age band (catalogue Band: "k2", "35", …), set once by the app shell; null for a grown-up. K–2 gets 56px buttons and a speaker. */
export function setSpotBand(b: string | null) {
  band = b ?? undefined;
}

const cleanSay = (s: string | undefined) => {
  const t = s?.replace(/\s+/g, " ").trim();
  return t ? (t.length > SAY_MAX ? `${t.slice(0, SAY_MAX - 1)}…` : t) : undefined;
};

/** Resolved, shown and not guarded, or null. */
function pick(id: string): Element | null {
  const el = resolveSpot(id);
  return el && !guardedBy(el) ? el : null;
}

export type SpotStatus = "ok" | "missing" | "guarded";

/** Whether an id can be lit right now, and if not, why: not on screen (or not an id), or guarded. Changes nothing. */
export function spotStatus(id: string): SpotStatus {
  const el = resolveSpot(id);
  return !el ? "missing" : guardedBy(el) ? "guarded" : "ok";
}

/** Lights one element. False when the id is unknown, hidden or guarded (and nothing changes). */
export function spot(id: string, opts: SpotOptions = {}): boolean {
  if (opts.steps?.length) return spotSteps([{ id, say: opts.say ?? "" }, ...opts.steps], opts);
  const target = pick(id);
  if (!target) return false;
  const say = cleanSay(opts.say);
  begin({ id, target, say, cue: opts.cue ?? "glow", dim: opts.dim ?? false, steps: null, index: 0 }, opts.ms ?? (say ? null : SPOT_MS), opts.focus);
  return true;
}

/** A walkthrough: one place at a time, Back / Next / Done. Starts at the first step that can be found. */
export function spotSteps(steps: SpotStep[], opts: Omit<SpotOptions, "say" | "steps" | "ms"> = {}): boolean {
  const list = steps.filter((s) => isSpotId(s.id)).map((s) => ({ id: s.id, say: cleanSay(s.say) ?? "" }));
  for (let i = 0; i < list.length; i++) {
    const target = pick(list[i].id);
    if (!target) continue;
    begin({ id: list[i].id, target, say: list[i].say || undefined, cue: opts.cue ?? "glow", dim: opts.dim ?? true, steps: list, index: i }, null, opts.focus);
    return true;
  }
  return false;
}

/** Next (1) or Back (-1) in a walkthrough, skipping steps that are gone. Next past the end, or on a single spot, finishes. */
export function stepSpot(delta: 1 | -1 = 1): boolean {
  if (!live) return false;
  advancing = null;
  const steps = live.steps;
  if (steps)
    for (let i = live.index + delta; i >= 0 && i < steps.length; i += delta) {
      const target = pick(steps[i].id);
      if (!target) continue;
      live = { ...live, id: steps[i].id, target, say: steps[i].say || undefined, index: i, nonce: 0 };
      reveal(target, false);
      emit();
      return true;
    }
  if (delta > 0) clearSpot();
  return false;
}

export function clearSpot() {
  if (!live) return;
  live = null;
  advancing = null;
  clearTimeout(timer);
  detach();
  emit();
}

/** Pauses the timer while the learner reads or uses the caption (hover, focus). */
export function holdSpot(on: boolean) {
  if (on === held) return;
  held = on;
  if (!live || duration === null) return;
  if (on) {
    clearTimeout(timer);
    remaining -= Date.now() - startedAt;
  } else run(Math.max(remaining, 2500));
}

/** Scrolls the lit element back into view and pulses it again (the edge indicator's job). */
export function revealSpot() {
  if (!live) return;
  reveal(live.target, true);
  live = { ...live, nonce: live.nonce + 1 };
  emit();
}

/**
 * Re-checks the lit element after the page changed: the same id re-found (a re-render) is followed;
 * otherwise a single spot clears, and a walkthrough moves on — a step's target going away is often the
 * step working ("Tap Add" turns the button into a form), and a step just used is already moving on.
 */
export function checkSpot() {
  if (!live || (live.target.isConnected && isShown(live.target))) return;
  const again = pick(live.id);
  if (again) {
    live = { ...live, target: again, nonce: live.nonce + 1 };
    emit();
    return;
  }
  if (!live.steps) return clearSpot();
  if (advancing?.session === live.session && advancing.index === live.index) return;
  stepSpot(1);
}

/** Test hook: clears the spot, guards, scrub and band. */
export function resetSpotlight() {
  clearSpot();
  guards.clear();
  defaultScrub = null;
  band = undefined;
  held = false;
  keyAt = -Infinity;
}

function begin(s: Omit<Spotlight, "session" | "nonce" | "band">, ms: number | null, focus?: boolean) {
  const fresh = !live;
  live = { ...s, session: ++sessions, nonce: 0, band };
  advancing = null;
  clearTimeout(timer);
  duration = ms && ms > 0 && Number.isFinite(ms) ? ms : null;
  if (duration !== null) {
    remaining = duration;
    if (!held) run(duration);
  }
  if (fresh) attach();
  reveal(s.target, false);
  if (focus) focusTarget(s.target);
  if (process.env.NODE_ENV !== "production" && !s.id.startsWith("auto.") && !spotName(s.target))
    console.error(`spot: "${s.id}" has no name to announce; give it data-spot-label (spotAttr(id, label)).`);
  emit();
}

function run(ms: number) {
  clearTimeout(timer);
  remaining = ms;
  startedAt = Date.now();
  timer = setTimeout(clearSpot, ms);
}

const TYPING = 'textarea, select, input:not([type="button"], [type="submit"], [type="reset"], [type="checkbox"], [type="radio"], [type="range"], [type="file"], [type="color"], [type="image"])';
const isEntry = (el: Element) => el.matches(TYPING) || isEditable(el) || ENTRY_ROLE.test(el.getAttribute("role") ?? "");

// The one thing this module does on load (in a browser): note when a key lands in a text field, so a
// spot never scrolls the page out from under someone mid-word. Focus alone is not typing: after sending
// a chat message the cursor stays in the box, and the tutor's pointing should still scroll.
const noteKey = (e: Event) => {
  if (e.target instanceof Element && isEntry(e.target)) keyAt = Date.now();
};
if (typeof document !== "undefined") {
  document.addEventListener("keydown", noteKey, true);
  document.addEventListener("input", noteKey, true);
}

function typing(): boolean {
  const a = document.activeElement;
  return !!a && a !== document.body && isEntry(a) && Date.now() - keyAt < TYPING_MS;
}

/** Mostly in view, where it can be seen: inside its panel and not under a sticky header or the tab bar. */
function inView(el: Element): boolean {
  const b = el.getBoundingClientRect();
  // A line in a drawing can be 0 wide: give it a pixel each way so it can count as seen.
  const r = { left: Math.min(b.left, b.right - 1), right: Math.max(b.right, b.left + 1), top: Math.min(b.top, b.bottom - 1), bottom: Math.max(b.bottom, b.top + 1) };
  const c = seenView(el);
  const w = Math.min(r.right, c.right) - Math.max(r.left, c.left);
  const h = Math.min(r.bottom, c.bottom) - Math.max(r.top, c.top);
  if (w <= 0 || h <= 0) return false;
  return (w * h) / ((r.right - r.left) * (r.bottom - r.top)) >= 0.9 || h >= (c.bottom - c.top) * 0.6;
}

function reveal(el: Element, force: boolean) {
  if (typeof el.scrollIntoView !== "function") return;
  if (!force && (typing() || inView(el))) return;
  const still = typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const tall = el.getBoundingClientRect().height > window.innerHeight * 0.6;
  el.scrollIntoView({ behavior: still ? "instant" : "smooth", block: tall ? "start" : "center", inline: "nearest" });
}

function focusTarget(el: Element) {
  const h = el as HTMLElement;
  if (typeof h.focus !== "function" || !(h.tabIndex >= 0 || el.matches("a[href], button, input, select, textarea"))) return;
  focusing = true;
  h.focus({ preventScroll: true });
  focusing = false;
}

/* The learner acted on what was pointed at: the spot did its job. */
function activated() {
  if (!live) return;
  if (!live.steps) return clearSpot();
  const at = { session: live.session, index: live.index };
  advancing = at;
  // Let the click land (a menu opens, a panel appears) before looking for the next step.
  setTimeout(() => {
    if (advancing === at) advancing = null;
    if (live?.session === at.session && live.index === at.index) stepSpot(1);
  }, 120);
}

/** Escape closes what is lit, and only that: the drawer or dialog behind it stays open for the next Escape. */
function onKey(e: KeyboardEvent) {
  if (e.key !== "Escape" || e.defaultPrevented || e.isComposing || !live) return;
  e.preventDefault();
  e.stopPropagation();
  clearSpot();
}
function onClick(e: Event) {
  if (live && e.target instanceof Node && live.target.contains(e.target)) activated();
}
function onFocusIn(e: Event) {
  if (!focusing && live && isEntry(live.target) && e.target instanceof Node && live.target.contains(e.target)) activated();
}

function attach() {
  document.addEventListener("keydown", onKey);
  document.addEventListener("click", onClick, true);
  document.addEventListener("focusin", onFocusIn, true);
  if (typeof MutationObserver === "function") {
    observer = new MutationObserver(() => checkSpot());
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["hidden", "inert", "aria-hidden"] });
  }
}

function detach() {
  document.removeEventListener("keydown", onKey);
  document.removeEventListener("click", onClick, true);
  document.removeEventListener("focusin", onFocusIn, true);
  observer?.disconnect();
  observer = null;
}
