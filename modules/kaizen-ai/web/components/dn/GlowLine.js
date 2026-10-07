'use client';
// The Thread's rail, drawn in on view: the companion arriving. Client leaf,
// purely decorative (aria-hidden).
//
// It follows the same entrance rule as Reveal, and for the same two reasons.
// (1) Hydration: `useReducedMotion()` reads the media query at first client
// render but is false during SSR, so branching on it in the render body made
// the server emit the Motion element (transform: scaleX(0) baked into the HTML)
// while a reduced-motion visitor's first client render emitted the plain line —
// a mismatch React declines to repair, and a real hydration error on /, /ai and
// /tutoring whenever prefers-reduced-motion was set. (2) Flicker: the drawn-in
// state is `initial`, applied at mount, so swapping in the Motion element after
// hydration would collapse a line the visitor is already looking at.
//
// So the line renders complete — the static, reduced-motion markup — for the
// server and the hydrating client alike, and only draws itself in if it was
// still below the fold when hydration ran. On the pages that use it (Thread
// sits well down the page) that is the normal case, so the entrance survives.
//
// Rebuild note: the gradient used to be three hand-typed hex stops from the
// retired palette. It is now the accent variable at three alphas, so the rail
// re-colors with the token and no page can drift a fourth rose into the system.
// It reads on paper and on coal without a tone prop, which is why it stayed one.
import { motion as Motion, useReducedMotion } from 'motion/react';
import { useEntrance, ENTRANCE_VIEWPORT } from '@/components/dn/Reveal';

const STYLE = {
  background:
    'linear-gradient(90deg, rgb(var(--c-accent)) 0%, rgb(var(--c-accent) / 0.55) 62%, rgb(var(--c-accent) / 0.16) 100%)',
  boxShadow: '0 0 10px rgb(var(--c-accent) / 0.18)',
};

export default function GlowLine({ className = '' }) {
  const reduce = useReducedMotion();
  const [ref, entering] = useEntrance(!reduce);
  if (!entering) {
    return <div ref={ref} aria-hidden className={`h-[2px] rounded-full ${className}`} style={STYLE} />;
  }
  return (
    <Motion.div
      aria-hidden
      className={`h-[2px] rounded-full origin-left ${className}`}
      style={STYLE}
      initial={{ scaleX: 0, opacity: 0.4 }}
      whileInView={{ scaleX: 1, opacity: 1 }}
      viewport={{ once: true, ...ENTRANCE_VIEWPORT }}
      transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
    />
  );
}
