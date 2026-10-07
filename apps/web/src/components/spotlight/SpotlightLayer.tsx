"use client";

import { usePathname } from "next/navigation";
import { Suspense, useEffect, useRef, useState, type CSSProperties, type RefObject } from "react";
import { createPortal } from "react-dom";
import { IconArrowRight, IconChevronDown, IconChevronLeft, IconChevronRight, IconChevronUp } from "@/components/icons";
import { btn } from "@/components/ui";
import { t as translate, useLocale, useT } from "@/i18n";
import { checkSpot, clearSpot, holdSpot, revealSpot, spotName, stepSpot, type Spotlight } from "@/lib/spotlight";
import type { Dir } from "./geometry";
import { useClient, usePhone, useReducedMotion, useSpotlight } from "./hooks";
import { edgeBars, measure, stackZ, type Geo } from "./measure";
import { SPOT_CSS } from "./styles";

// The spotlight layer: mounted once near the root (app/layout.tsx). It draws whatever lib/spotlight
// has lit — the ring (or arrow), the caption beside it (docked above the tab bar on phones), the
// walkthrough dim, and an edge button when the learner has scrolled the target away. It is all fixed
// overlay: nothing moves the page, and only the caption and the edge button take pointer events.

/** The caption's id, which the lit element is aria-describedby while it glows. */
export const SAY_ID = "kz-spot-say";
export const SHORTCUT = "Alt+Shift+T";

export function SpotlightLayer() {
  const client = useClient();
  return client ? createPortal(<Layer />, document.body) : null;
}

function Layer() {
  const live = useSpotlight();
  const still = useReducedMotion();
  const locale = useLocale();
  const root = useRef<HTMLDivElement>(null);
  const announcer = useRef<HTMLDivElement>(null);

  // Polite announcement per spot and per step: the caption, or what is being pointed at.
  const target = live?.target;
  const say = live?.say;
  const n = live?.steps ? live.index + 1 : undefined;
  const total = live?.steps?.length;
  useEffect(() => {
    const node = announcer.current;
    if (!node) return;
    node.textContent = "";
    if (!target) return;
    const name = spotName(target);
    const text = say
      ? n && total ? translate(locale, "spot.announceStep", { n, total, say }) : say
      : name ? translate(locale, "spot.lookAt", { name }) : translate(locale, "spot.lookHere");
    // Cleared first, then set: the same words twice in a row are still announced.
    const id = setTimeout(() => (node.textContent = text), 60);
    return () => clearTimeout(id);
  }, [target, say, n, total, locale]);

  return (
    <div ref={root} data-spot-layer="" className={still ? "kz-spot--still" : undefined}>
      <style>{SPOT_CSS}</style>
      <div ref={announcer} role="status" aria-live="polite" aria-atomic="true" className="sr-only" />
      <Suspense fallback={null}>
        <RouteWatch />
      </Suspense>
      {live && <Lit key={live.session} live={live} layer={root} />}
    </div>
  );
}

/** A new page means the old pointing no longer applies. */
function RouteWatch() {
  const path = usePathname();
  const last = useRef(path);
  useEffect(() => {
    if (last.current !== path) clearSpot();
    last.current = path;
  }, [path]);
  return null;
}

function Lit({ live, layer }: { live: Spotlight; layer: RefObject<HTMLDivElement | null> }) {
  const phone = usePhone();
  const box = useRef<HTMLElement>(null);
  const [geo, setGeo] = useState<Geo | null>(null);
  const { target, cue, dim } = live;
  const hasCallout = Boolean(live.say || live.steps);
  const described = Boolean(live.say);

  // Track the target: scroll (any scroller, capture phase), resize, its own size, focus moving (the caption
  // steps off a field being typed in); animation frames only while something moves.
  useEffect(() => {
    let frame = 0, settled = 0, last = "";
    let bars = edgeBars(layer.current);
    const z = stackZ(target);
    const tick = () => {
      frame = 0;
      const g = measure({ target, layer: layer.current, callout: box.current, hasCallout, cue, dim, phone, bars, z });
      if (!g) return checkSpot();
      const key = JSON.stringify(g);
      if (key !== last) {
        last = key;
        settled = 0;
        setGeo(g);
      } else settled++;
      if (settled < 12) frame = requestAnimationFrame(tick);
    };
    const kick = () => {
      settled = 0;
      if (!frame) frame = requestAnimationFrame(tick);
    };
    const resized = () => {
      bars = edgeBars(layer.current);
      kick();
    };
    const vv = window.visualViewport;
    window.addEventListener("scroll", kick, { capture: true, passive: true });
    window.addEventListener("resize", resized);
    vv?.addEventListener("resize", resized);
    vv?.addEventListener("scroll", kick);
    document.addEventListener("focusin", kick);
    const ro = typeof ResizeObserver === "function" ? new ResizeObserver(kick) : null;
    ro?.observe(target);
    if (box.current) ro?.observe(box.current);
    kick();
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", kick, { capture: true });
      window.removeEventListener("resize", resized);
      vv?.removeEventListener("resize", resized);
      vv?.removeEventListener("scroll", kick);
      document.removeEventListener("focusin", kick);
      ro?.disconnect();
    };
  }, [target, cue, dim, hasCallout, phone, layer]);

  // While it glows, the element is described by the caption; afterwards it is exactly as it was.
  useEffect(() => {
    if (!described) return;
    const tokens = (target.getAttribute("aria-describedby") ?? "").split(/\s+/).filter(Boolean);
    if (!tokens.includes(SAY_ID)) target.setAttribute("aria-describedby", [...tokens, SAY_ID].join(" "));
    return () => {
      const rest = (target.getAttribute("aria-describedby") ?? "").split(/\s+/).filter((x) => x && x !== SAY_ID);
      if (rest.length) target.setAttribute("aria-describedby", rest.join(" "));
      else target.removeAttribute("aria-describedby");
    };
  }, [target, described]);

  // Keyboard users reach the caption without it ever taking focus on its own.
  useEffect(() => {
    if (!hasCallout) return;
    const onKey = (e: KeyboardEvent) => {
      if (!(e.altKey && e.shiftKey && e.code === "KeyT")) return;
      e.preventDefault();
      box.current?.querySelector<HTMLElement>("[data-spot-primary]")?.focus();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [hasCallout]);

  const shown = geo && !geo.off;
  const pulse = `${live.index}:${live.nonce}`;
  return (
    <>
      {dim && shown && geo.hole && (
        <svg aria-hidden="true" className="kz-spot-scrim" style={{ zIndex: geo.z - 1 }} width={geo.vw} height={geo.vh}>
          <path fillRule="evenodd" d={geo.hole} />
        </svg>
      )}
      {cue === "glow" && shown && (
        <div
          key={pulse}
          aria-hidden="true"
          className="kz-spot-ring"
          style={{ zIndex: geo.z, translate: `${geo.ring.x}px ${geo.ring.y}px`, width: geo.ring.w, height: geo.ring.h, borderRadius: geo.ring.r }}
        />
      )}
      {cue === "point" && shown && geo.arrow && (
        <div key={pulse} aria-hidden="true" className="kz-spot-arrow" style={{ zIndex: geo.z, translate: `${geo.arrow.x}px ${geo.arrow.y}px`, rotate: `${geo.arrow.angle}deg` }}>
          <svg width="36" height="36" viewBox="0 0 36 36" fill="none" strokeLinecap="round" strokeLinejoin="round">
            <path className="kz-spot-halo" d="M5 18H30M22 10l8 8-8 8" strokeWidth="7" />
            <path className="kz-spot-shaft" d="M5 18H30M22 10l8 8-8 8" strokeWidth="3.25" />
          </svg>
        </div>
      )}
      {geo?.off && geo.edge && !(phone && hasCallout) && <Edge dir={geo.off} x={geo.edge.x} y={geo.edge.y} band={geo.band} />}
      {hasCallout && <Callout live={live} geo={geo} phone={phone} box={box} />}
    </>
  );
}

const dirOfAngle = (a: number): Dir => (a > -45 && a <= 45 ? "right" : a > 45 && a <= 135 ? "down" : a < -45 && a >= -135 ? "up" : "left");

function Callout({ live, geo, phone, box }: { live: Spotlight; geo: Geo | null; phone: boolean; box: RefObject<HTMLElement | null> }) {
  const t = useT();
  const steps = live.steps;
  const last = !steps || live.index >= steps.length - 1;
  const primary = useRef<HTMLButtonElement>(null);
  const hover = useRef(false);
  const inside = useRef(false);
  const returnTo = useRef<HTMLElement | null>(null);
  const hold = () => holdSpot(hover.current || inside.current);

  // Closing with focus inside (Got it, Done, Escape) hands focus back to where the learner was.
  useEffect(() => {
    const was = { inside, returnTo };
    return () => {
      holdSpot(false);
      const back = was.returnTo.current;
      if (was.inside.current && back?.isConnected) back.focus({ preventScroll: true });
    };
  }, []);

  const dock = phone ? geo?.dock : null;
  const away = !dock && Boolean(geo?.off);
  const ready = Boolean(geo && (dock || geo.callout || away));
  const style: CSSProperties = dock
    ? dock.at === "bottom" ? { top: "auto", bottom: dock.inset } : { top: dock.inset, bottom: "auto" }
    : geo?.callout ? { translate: `${geo.callout.x}px ${geo.callout.y}px` } : {};
  const side = !dock ? geo?.callout?.side : undefined;
  const dir = dock ? (geo?.off ?? dirOfAngle(dock.angle)) : null;

  return (
    <section
      ref={box}
      role="region"
      aria-label={t("spot.region")}
      data-ready={ready ? undefined : "false"}
      data-away={away ? "" : undefined}
      data-dock={dock?.at}
      data-side={side}
      data-band={geo?.band}
      style={style}
      className="kz-spot-callout rounded-md border border-border bg-panel p-3 text-ink shadow-soft"
      onPointerEnter={() => {
        hover.current = true;
        hold();
      }}
      onPointerLeave={() => {
        hover.current = false;
        hold();
      }}
      onFocus={(e) => {
        if (!inside.current && e.relatedTarget instanceof HTMLElement && !e.currentTarget.contains(e.relatedTarget)) returnTo.current = e.relatedTarget;
        inside.current = true;
        hold();
      }}
      onBlur={(e) => {
        if (!(e.relatedTarget instanceof Node) || e.currentTarget.contains(e.relatedTarget)) return;
        inside.current = false;
        hold();
      }}
      onKeyDown={(e) => {
        if (e.key !== "Escape") return;
        e.preventDefault();
        clearSpot();
      }}
    >
      {/* One row when the words are short (caption · Got it), else the caption above its buttons. */}
      <div className="flex flex-wrap items-center justify-end gap-x-3 gap-y-2.5">
        <div className="flex min-w-0 flex-auto items-center gap-3">
          {dock && dir && (
            <button
              type="button"
              onClick={revealSpot}
              aria-label={`${t("spot.show")} (${t(`spot.dir.${dir}`)})`}
              className="kz-spot-btn kz-spot-dir grid size-11 shrink-0 place-items-center rounded-full border border-border bg-panel2 text-accent transition-colors hover:border-ink/30"
            >
              <span style={{ rotate: `${dock.angle}deg` }}>
                <IconArrowRight size={20} strokeWidth={2.2} />
              </span>
            </button>
          )}
          <p id={SAY_ID} className="kz-spot-say min-w-0 flex-auto text-body leading-snug text-pretty">
            {live.say}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {steps && <span className="mr-1 font-opmono text-xs tabular-nums text-muted">{t("spot.step", { n: live.index + 1, total: steps.length })}</span>}
          {steps && live.index > 0 && (
            <button
              type="button"
              className={btn("ghost", "md", "kz-spot-btn px-4")}
              onClick={(e) => {
                const had = e.currentTarget === document.activeElement;
                stepSpot(-1);
                // Back vanishes on the first step; keep the keyboard on the caption.
                if (had) requestAnimationFrame(() => (!document.activeElement || document.activeElement === document.body) && primary.current?.focus());
              }}
            >
              {t("common.back")}
            </button>
          )}
          <button
            ref={primary}
            type="button"
            data-spot-primary=""
            aria-keyshortcuts={SHORTCUT}
            onClick={() => (steps ? stepSpot(1) : clearSpot())}
            className={btn(steps ? "primary" : "secondary", "md", "kz-spot-btn px-4")}
          >
            {steps ? (last ? t("spot.done") : t("common.next")) : t("spot.gotIt")}
          </button>
        </div>
      </div>
      {geo?.callout && side && <span aria-hidden="true" className="kz-spot-tail" style={side === "top" || side === "bottom" ? { left: geo.callout.tail } : { top: geo.callout.tail }} />}
    </section>
  );
}

const CHEVRON = { up: IconChevronUp, down: IconChevronDown, left: IconChevronLeft, right: IconChevronRight };
const SHIFT: Record<Dir, string> = { up: "-50% 0", down: "-50% -100%", left: "0 -50%", right: "-100% -50%" };

/** Shown when the learner scrolled the lit element away: says which way, and brings it back. */
function Edge({ dir, x, y, band }: { dir: Dir; x: number; y: number; band?: string }) {
  const t = useT();
  const Icon = CHEVRON[dir];
  return (
    <button
      type="button"
      onClick={revealSpot}
      aria-label={`${t("spot.show")} (${t(`spot.dir.${dir}`)})`}
      data-band={band}
      style={{ left: x, top: y, translate: SHIFT[dir] }}
      className={btn("secondary", "md", "kz-spot-btn kz-spot-edge shadow-soft")}
    >
      <Icon size={18} strokeWidth={2.2} className="text-accent" />
      {t("spot.show")}
    </button>
  );
}
