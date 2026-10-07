// The spotlight's own CSS, rendered once by the layer (it owns no global stylesheet). The ring is the
// one sanctioned halo in the KaizenEDU world: a 2px rose rule with a soft rose glow that follows the
// element's corners, two calm pulses on arrival, then steady. Reduced motion: steady from the start.
// Forced colors: the system Highlight outline, no glow, no dim.

const ACCENT = "var(--color-accent)";
const glow = (pct: number) => `color-mix(in srgb, ${ACCENT} ${pct}%, transparent)`;
const EASE = "cubic-bezier(0.16, 1, 0.3, 1)";

export const SPOT_CSS = `
.kz-spot-ring, .kz-spot-arrow, .kz-spot-scrim { position: fixed; left: 0; top: 0; pointer-events: none; }
.kz-spot-ring {
  box-sizing: border-box;
  box-shadow: 0 0 0 2px ${ACCENT}, 0 0 0 5px ${glow(14)}, 0 0 22px 6px ${glow(22)};
  animation: kz-spot-in 420ms ${EASE} both;
}
.kz-spot-ring::after {
  content: ""; position: absolute; inset: 0; border-radius: inherit;
  animation: kz-spot-pulse 1100ms ${EASE} 260ms 2 both;
}
.kz-spot-arrow { width: 36px; height: 36px; margin: -18px 0 0 -18px; animation: kz-spot-fade 240ms ease-out both; }
.kz-spot-arrow svg { display: block; animation: kz-spot-nudge 700ms ${EASE} 200ms 2 both; }
.kz-spot-arrow .kz-spot-halo { stroke: var(--color-panel); }
.kz-spot-arrow .kz-spot-shaft { stroke: ${ACCENT}; }
.kz-spot-scrim { animation: kz-spot-fade 260ms ease-out both; }
.kz-spot-scrim path { fill: color-mix(in srgb, var(--color-ink) 26%, transparent); }

.kz-spot-callout { position: fixed; left: 0; top: 0; z-index: 60; width: max-content; max-width: min(20rem, calc(100vw - 2rem)); transition: opacity 160ms ease-out; }
.kz-spot-callout[data-dock] { left: 12px; right: 12px; width: auto; max-width: none; }
.kz-spot-callout[data-ready="false"] { opacity: 0; pointer-events: none; }
.kz-spot-callout[data-away] { visibility: hidden; }
.kz-spot-tail {
  position: absolute; width: 12px; height: 12px; margin: -6px 0 0 -6px; rotate: 45deg;
  background: var(--color-panel); border: 1px solid transparent;
}
.kz-spot-callout[data-side="bottom"] .kz-spot-tail { top: 0; border-top-color: var(--color-border); border-left-color: var(--color-border); }
.kz-spot-callout[data-side="top"] .kz-spot-tail { top: 100%; border-bottom-color: var(--color-border); border-right-color: var(--color-border); }
.kz-spot-callout[data-side="right"] .kz-spot-tail { left: 0; border-bottom-color: var(--color-border); border-left-color: var(--color-border); }
.kz-spot-callout[data-side="left"] .kz-spot-tail { left: 100%; border-top-color: var(--color-border); border-right-color: var(--color-border); }
.kz-spot-dir > span { display: grid; transition: rotate 200ms ${EASE}; }
.kz-spot-edge { position: fixed; z-index: 60; animation: kz-spot-fade 200ms ease-out both; }

[data-band="k2"] .kz-spot-btn, .kz-spot-btn[data-band="k2"] { min-height: 56px; min-width: 56px; font-size: 1rem; }
.kz-spot-callout[data-band="k2"] .kz-spot-say { font-size: 1.125rem; }

@keyframes kz-spot-in { from { opacity: 0; scale: 1.04; } to { opacity: 1; scale: 1; } }
@keyframes kz-spot-pulse {
  from { box-shadow: 0 0 0 0 ${glow(42)}; }
  to { box-shadow: 0 0 0 14px ${glow(0)}; }
}
@keyframes kz-spot-nudge { 0%, 100% { translate: 0 0; } 45% { translate: 6px 0; } }
@keyframes kz-spot-fade { from { opacity: 0; } to { opacity: 1; } }

.kz-spot--still .kz-spot-ring { animation: kz-spot-fade 160ms ease-out both; }
.kz-spot--still .kz-spot-ring::after, .kz-spot--still .kz-spot-arrow svg { animation: none; }
@media (prefers-reduced-motion: reduce) {
  .kz-spot-ring { animation: kz-spot-fade 160ms ease-out both; }
  .kz-spot-ring::after, .kz-spot-arrow svg { animation: none; }
}
@media (forced-colors: active) {
  .kz-spot-ring { box-shadow: none; outline: 3px solid Highlight; outline-offset: 0; }
  .kz-spot-ring::after, .kz-spot-scrim { display: none; }
  .kz-spot-arrow .kz-spot-shaft { stroke: Highlight; }
  .kz-spot-arrow .kz-spot-halo { stroke: Canvas; }
  .kz-spot-callout, .kz-spot-edge { border: 1px solid CanvasText; }
  .kz-spot-tail { display: none; }
}
`;
