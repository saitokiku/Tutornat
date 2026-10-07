'use client';

import { useState } from 'react';
import { RotateCcw } from 'lucide-react';

import { publicConfig } from '@/kaizen.config';

import { NtButton } from '@/components/tutor/ui/button';

import './storyboard.css';

const AI_LABEL = publicConfig.product.aiLabel;

/**
 * Plays the three panes of a session once: the tutor listens, thinks, speaks
 * while drawing two fraction bars, and the record gains a check line. Not a
 * video; drawn in CSS and SVG and labelled a preview. "Play again" remounts
 * the scene so the animations restart.
 */
export function Storyboard() {
  const [run, setRun] = useState(0);
  return (
    <figure className="sb flex flex-col gap-4">
      <div key={run} className="sb-stage" aria-hidden="true">
        <div className="sb-tile sb-tutor">
          <TutorPresence />
          <span className="sb-tag">{AI_LABEL}</span>
          <span className="sb-timer">04:12</span>
          <span className="sb-state">
            <span className="sb-state-listening">Listening</span>
            <span className="sb-state-thinking">Thinking</span>
            <span className="sb-state-speaking">Speaking</span>
            <span className="sb-state-done">Check recorded</span>
          </span>
        </div>
        <div className="sb-tile sb-board">
          <Board />
        </div>
        <div className="sb-tile sb-record">
          <p className="sb-line sb-line-learner">
            <b>Learner</b>
            <span>Why is three quarters bigger than two thirds?</span>
          </p>
          <p className="sb-line sb-line-tutor">
            <b>Tutor</b>
            <span>Let’s draw both on bars the same length. Which one leaves less empty?</span>
          </p>
          <p className="sb-line sb-line-check">
            <b>Check</b>
            <span>Compare 3/4 and 2/3. Correct, unassisted. Confirms in a later session.</span>
          </p>
        </div>
      </div>
      <figcaption className="flex flex-wrap items-center justify-between gap-3">
        <span className="nt-small">
          Preview. Drawn in code to show the layout of a session; it is not a recording.
        </span>
        <NtButton tone="secondary" size="sm" onClick={() => setRun((value) => value + 1)}>
          <RotateCcw aria-hidden="true" />
          Play again
        </NtButton>
      </figcaption>
    </figure>
  );
}

/**
 * The tutor as it actually appears in a session: a luminous form, not a face.
 *
 * The landing page used to show an oval head with two dot eyes, which is the
 * thing `presence-rig.ts` exists to avoid — a drawn face invites a comparison
 * to a real one and loses it. This mirrors the shipped presence so the first
 * thing a parent sees is the thing their child will meet, and it says the four
 * beats of a turn through *structure* rather than expression:
 *
 * - listening  the form opens to its widest and solid rings travel outward.
 *              Outward is receptive: the room is being let in.
 * - thinking   the exact inverse, so the two can never be read as the same
 *              state — the form draws in, the aura tightens, and one mote
 *              circles outside it and rests. A mote that hesitates reads as
 *              considering; one at constant speed reads as a spinner.
 * - speaking   the form deforms unevenly and a core lights inside it.
 * - done       everything settles and the aura warms once.
 *
 * One linear pass over `--sb-duration`, keyed to the same phase boundaries as
 * the rest of the scene, and every state is a different shape rather than a
 * different motion — so it still reads with `prefers-reduced-motion` on.
 */
function TutorPresence() {
  return (
    <svg className="sb-face" viewBox="0 0 160 120" role="presentation" focusable="false">
      <defs>
        {/* Soft everywhere. A hard edge or a specular highlight turns this into
            a billiard ball; the form has to read as light with a boundary,
            not as a moulded object. */}
        <filter id="sb-soft" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="1.6" />
        </filter>
        <filter id="sb-glow" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="7" />
        </filter>
        <radialGradient id="sb-aura" cx="50%" cy="52%" r="50%">
          <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.22" />
          <stop offset="58%" stopColor="var(--primary)" stopOpacity="0.09" />
          <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="sb-body" cx="46%" cy="42%" r="68%">
          <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.44" />
          <stop offset="70%" stopColor="var(--primary)" stopOpacity="0.62" />
          <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.38" />
        </radialGradient>
        <radialGradient id="sb-inner" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="var(--card)" stopOpacity="0.85" />
          <stop offset="100%" stopColor="var(--card)" stopOpacity="0" />
        </radialGradient>
      </defs>

      <rect width="160" height="120" fill="var(--accent)" />
      <ellipse
        className="sb-aura"
        cx="80"
        cy="61"
        rx="50"
        ry="44"
        fill="url(#sb-aura)"
        filter="url(#sb-glow)"
      />

      {/* Rings: outward while listening, gathering inward while thinking. */}
      <g className="sb-rings" fill="none" stroke="var(--primary)" strokeLinecap="round">
        <circle
          className="sb-ring sb-ring-1"
          cx="80"
          cy="61"
          r="30"
          strokeWidth="1.5"
          strokeOpacity="0.55"
        />
        <circle
          className="sb-ring sb-ring-2"
          cx="80"
          cy="61"
          r="30"
          strokeWidth="1.3"
          strokeOpacity="0.45"
        />
        <circle
          className="sb-ring sb-ring-3"
          cx="80"
          cy="61"
          r="30"
          strokeWidth="1.2"
          strokeOpacity="0.5"
        />
      </g>

      <g className="sb-form">
        {/* Seven lobes, exaggerated enough to be visible at this size. A circle
            reads as a button or a spinner; this never quite resolves into a
            shape you can name, which is what makes it read as alive. */}
        <path
          className="sb-blob"
          d="M80 30 C95 29 108 37 112 50 C116 62 111 74 101 82 C92 90 79 96 68 92
             C56 88 47 78 45 66 C43 54 47 42 57 35 C64 30 72 30 80 30 Z"
          fill="url(#sb-body)"
          filter="url(#sb-soft)"
        />
        {/* Lit from inside, off-centre, with no hard edge to it. */}
        <ellipse cx="72" cy="54" rx="24" ry="21" fill="url(#sb-inner)" opacity="0.5" />
        <ellipse className="sb-core" cx="78" cy="60" rx="13" ry="11" fill="url(#sb-inner)" />
      </g>

      {/* One mote, outside the form, that moves and then rests. */}
      <circle className="sb-mote" cx="80" cy="61" r="2.6" fill="var(--primary)" />
    </svg>
  );
}

function Board() {
  return (
    <svg
      viewBox="0 0 160 120"
      role="presentation"
      focusable="false"
      className="block h-full w-full"
    >
      <text
        className="sb-bar-label sb-bar-label-a"
        x="12"
        y="30"
        fontSize="10"
        fontWeight="600"
        fill="var(--foreground)"
      >
        3/4
      </text>
      <rect
        x="36"
        y="20"
        width="112"
        height="16"
        rx="3"
        fill="none"
        stroke="var(--border)"
        strokeWidth="1.5"
      />
      <rect
        className="sb-bar-fill sb-bar-fill-a"
        x="36"
        y="20"
        width="84"
        height="16"
        rx="3"
        fill="var(--primary)"
      />
      <text
        className="sb-bar-label sb-bar-label-b"
        x="12"
        y="70"
        fontSize="10"
        fontWeight="600"
        fill="var(--foreground)"
      >
        2/3
      </text>
      <rect
        x="36"
        y="60"
        width="112"
        height="16"
        rx="3"
        fill="none"
        stroke="var(--border)"
        strokeWidth="1.5"
      />
      <rect
        className="sb-bar-fill sb-bar-fill-b"
        x="36"
        y="60"
        width="74.7"
        height="16"
        rx="3"
        fill="var(--nt-warning)"
      />
      <text
        className="sb-bar-label sb-bar-label-b"
        x="36"
        y="102"
        fontSize="9"
        fill="var(--muted-foreground)"
      >
        Same whole. Less empty space means more.
      </text>
    </svg>
  );
}
