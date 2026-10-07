'use client';
// The one motion primitive of the Day/Night surface. Everything animated on
// the marketing pages goes through this wrapper (GlowLine borrows its entrance
// rule) so behavior is uniform and prefers-reduced-motion collapses it all at
// once.
//
// Two constraints pull in opposite directions, and both are load-bearing:
//
// 1. The server HTML must never carry opacity:0. An earlier version put
//    `initial={{ opacity: 0, y }}` straight into the render and restored it
//    with `whileInView`, so the *server* HTML shipped every wrapped section of
//    nine public pages hidden. Readability then depended on JS running AND an
//    IntersectionObserver callback firing: a failed bundle, a blocked script,
//    or an observer that never fired left the storefront blank below the fold
//    behind a 200 and a complete DOM — no error, nothing in Sentry, nothing a
//    synthetic uptime check would notice. (`useReducedMotion()` is no defence:
//    it reads the media query at first client render and returns false during
//    SSR.)
//
// 2. Pixels the browser has already painted must not be re-hidden. Rendering a
//    plain div until hydration and then swapping in a Motion element satisfies
//    (1), but Motion applies `initial` at mount — so the hero painted, blanked,
//    and faded back in on every load, delays included.
//
// Both hold if the *entrance* is decided per element, once, at hydration:
// everything renders as a plain visible div (the markup the server ships and
// the markup React hydrates — identical either way, reduced motion or not, so
// there is nothing for React to repair), and one effect then measures each
// wrapper. Only a wrapper still below the fold — content the visitor has not
// seen — is swapped for a Motion element and given its entrance on scroll.
// Anything already on screen keeps the div it was painted with and is never
// touched again. So: no flicker, no re-hide, no compounding delay on visible
// content, an entrance for everything below the fold, and a readable page with
// JS off. A hero is on screen by definition, so on a normal load it simply
// stays; it animates only where a group starts off-screen.
import { useEffect, useRef, useState } from 'react';
import { motion as Motion, useReducedMotion } from 'motion/react';

// Trigger geometry, shared by both exports. `amount: 'some'` — any part of the
// element crossing the viewport — rather than a fraction of the element: a
// block taller than the viewport can never show 30% of itself, and the old
// `amount: 0.3` left exactly those blocks hidden forever, the failure this
// primitive keeps producing. No viewport margin either, for the same reason: a
// negative bottom margin buys a more staged entrance at the price of stranding
// anything that ends up inside that band at the very bottom of a short page,
// where there is no scroll left to push it past the line.
export const ENTRANCE_VIEWPORT = { amount: 'some' };

const EASE = [0.16, 1, 0.3, 1];

// Decides, once, whether this element gets an entrance.
//
// The decision cannot be made during render: server and hydrating client have
// to emit the same markup, and Motion reads `initial` only at mount. So the
// element starts as a plain visible div, and the effect below — the first
// moment we are allowed to differ from the server — measures it. Swapping div
// -> Motion.div is a change of element *type*, so React mounts the replacement
// fresh and `initial` applies; a Motion element that was already mounted would
// ignore a later change to `initial` and never animate at all.
//
// Fails toward visible: only a measurable box that is provably below the fold
// animates. Zero-sized, unmeasurable, or already-seen content stays as it is.
export function useEntrance(enabled) {
  const ref = useRef(null);
  const [entering, setEntering] = useState(false);
  useEffect(() => {
    if (!enabled) return;
    const node = ref.current;
    if (!node) return;
    const rect = node.getBoundingClientRect();
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 0;
    if (rect.height > 0 && viewportHeight > 0 && rect.top >= viewportHeight) setEntering(true);
  }, [enabled]);
  return [ref, entering];
}

export default function Reveal({ children, delay = 0, y = 24, once = true, className = '' }) {
  const reduce = useReducedMotion();
  const [ref, entering] = useEntrance(!reduce);
  if (!entering) {
    return <div ref={ref} className={className}>{children}</div>;
  }
  return (
    <Motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once, ...ENTRANCE_VIEWPORT }}
      transition={{ duration: 0.6, delay, ease: EASE }}
    >
      {children}
    </Motion.div>
  );
}

// Staggered container for hero entrances: children enter in sequence when the
// group scrolls into view. Same rule as above, and for the same reason it uses
// `whileInView` rather than `animate` — `animate` runs on mount regardless of
// where the group is, which is precisely how already-painted heroes came to be
// re-hidden. The per-child wrapper is rendered in both branches so the swap
// cannot move the layout.
export function RevealGroup({ children, step = 0.06, className = '' }) {
  const reduce = useReducedMotion();
  const [ref, entering] = useEntrance(!reduce);
  const items = Array.isArray(children) ? children : [children];

  if (!entering) {
    return (
      <div ref={ref} className={className}>
        {items.map((child, i) => (
          <div key={i}>{child}</div>
        ))}
      </div>
    );
  }

  // Stagger is driven by the container so the children enter as one sequence,
  // instead of each child racing its own observer.
  const group = { hidden: {}, shown: { transition: { staggerChildren: step } } };
  const item = {
    hidden: { opacity: 0, y: 20 },
    shown: { opacity: 1, y: 0, transition: { duration: 0.55, ease: EASE } },
  };
  return (
    <Motion.div
      className={className}
      variants={group}
      initial="hidden"
      whileInView="shown"
      viewport={{ once: true, ...ENTRANCE_VIEWPORT }}
    >
      {items.map((child, i) => (
        <Motion.div key={i} variants={item}>
          {child}
        </Motion.div>
      ))}
    </Motion.div>
  );
}
