'use client';

/**
 * The contact sheet for whatever the tutor is on screen.
 *
 * Two jobs, in this order:
 *
 * 1. **Compare all three.** The abstract presence, the SVG character, and the
 *    Rive seam, in three columns against the same six states, on one screen.
 *    That is how the choice gets made — by looking, not by reading a rig file.
 *    The Rive column shows what a build with no `.riv` commissioned actually
 *    does today, which is fall back to the character; it is labelled as such
 *    rather than faked.
 * 2. **Judge one in detail.** Every expression, gaze, and level for whichever
 *    rig is selected, because both are imperative and driven at frame rate.
 *
 * Dev-only; the route that renders it (`app/(learner)/eval/avatar`) refuses to
 * build in production.
 *
 * Query flags, so a screenshot run needs no clicking:
 *   ?dark=1      render on the dark surface
 *   ?reduced=1   force `prefers-reduced-motion: reduce` into the rigs
 *   ?still=1     freeze the reaction loop on its held pose
 *   ?rig=presence|character   which rig the detail rows below show
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';

import type { AvatarInputs, AvatarState, ReactionKind } from '@/lib/tutor/contracts';

import { PRESENCE_KINDS, resolvePresence, type PresenceKind } from './config';
import { createAvatarDriver } from './create-driver';
import { BOARD_GAZE, type AvatarDriver, type AvatarGaze } from './driver';

type Expression = AvatarInputs['expression'];
type DetailRig = 'presence' | 'character';

/** How the cell feeds `setMouth` each frame. */
type MouthSource = number | 'speech' | 'sweep';

interface CellSpec {
  caption: string;
  note?: string;
  state: AvatarState;
  expression?: Expression;
  gaze?: AvatarGaze;
  mouth?: MouthSource;
  /** Fire this reaction on a loop so anticipation and settle are visible live. */
  reaction?: ReactionKind;
}

/**
 * A synthetic speech envelope: syllable bursts of varying strength with short
 * gaps, which is what the playback queue's analyser produces. A constant
 * amplitude cannot show whether a rig reads as speech.
 */
function speechEnvelope(t: number): number {
  const syllable = 190;
  const index = Math.floor(t / syllable);
  const phase = (t % syllable) / syllable;
  // A repeating but non-obvious pattern of syllable strengths, plus two rests.
  const strengths = [0.82, 0.34, 0.61, 0.9, 0.25, 0, 0.7, 0.45, 0.88, 0.3, 0, 0.55];
  const strength = strengths[index % strengths.length];
  const attack = phase < 0.22 ? phase / 0.22 : 1 - (phase - 0.22) / 0.78;
  return Math.max(0, strength * attack);
}

function expressionForReaction(kind: ReactionKind): Expression | null {
  if (kind === 'smile') return 'smile';
  if (kind === 'not_quite') return 'not-quite';
  return null;
}

function AvatarCell({
  spec,
  kind,
  reduced,
  still,
  size,
}: {
  spec: CellSpec;
  kind: PresenceKind;
  reduced: boolean;
  still: boolean;
  /** Fixed pixel width, for the "does it read at 128 px" row. */
  size?: number;
}) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const specRef = useRef(spec);
  const reducedRef = useRef(reduced);
  const stillRef = useRef(still);
  specRef.current = spec;
  reducedRef.current = reduced;
  stillRef.current = still;

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const driver: AvatarDriver = createAvatarDriver(host, {
      presence: kind,
      label: `${kind}, ${spec.caption}`,
      reducedMotion: () => reducedRef.current,
      // `still` is for screenshots: a fixed roll pushes every blink to the far
      // end of its jitter range, so a still frame is not a lottery over which
      // faces happen to be caught with their eyes shut.
      random: stillRef.current ? () => 1 : undefined,
    });
    driver.setState(spec.state);
    driver.setGaze(spec.gaze ?? { x: 0, y: 0 });

    let frame = 0;
    let reactedAt = -Infinity;
    const start = performance.now();
    const pump = (t: number) => {
      const current = specRef.current;
      const elapsed = t - start;
      if (current.expression) driver.set({ expression: current.expression });
      const source = current.mouth;
      if (typeof source === 'number') driver.setMouth(source);
      else if (source === 'speech') driver.setMouth(speechEnvelope(elapsed));
      else if (source === 'sweep') driver.setMouth((Math.sin(elapsed / 900) + 1) / 2);
      if (current.reaction) {
        if (stillRef.current) {
          // Held, so a still frame shows the reaction pose rather than
          // whatever the decay happened to be on at capture time.
          const held = expressionForReaction(current.reaction);
          if (held) driver.set({ expression: held });
        } else if (elapsed - reactedAt > 2600) {
          reactedAt = elapsed;
          driver.react(current.reaction);
        }
      }
      frame = requestAnimationFrame(pump);
    };
    frame = requestAnimationFrame(pump);
    return () => {
      cancelAnimationFrame(frame);
      driver.dispose();
    };
    // The rigs are imperative: built once and fed by the pump above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind]);

  return (
    <div
      ref={hostRef}
      className="nt-ap-face"
      style={size ? { width: `${size}px`, height: `${size}px` } : undefined}
    />
  );
}

function CaptionedCell(props: {
  spec: CellSpec;
  kind: PresenceKind;
  reduced: boolean;
  still: boolean;
}) {
  return (
    <figure className="nt-ap-cell">
      <AvatarCell {...props} />
      <figcaption>
        <span className="nt-ap-caption">{props.spec.caption}</span>
        {props.spec.note ? <span className="nt-ap-note">{props.spec.note}</span> : null}
      </figcaption>
    </figure>
  );
}

// --- What the columns are --------------------------------------------------

interface Column {
  kind: PresenceKind;
  title: string;
  blurb: string;
}

const COLUMNS: readonly Column[] = [
  {
    kind: 'presence',
    title: 'Presence',
    blurb: 'The default. An abstract luminous form: nothing to compare to a face.',
  },
  {
    kind: 'character',
    title: 'Character',
    blurb: 'The SVG character rig. Kept for a five-kid test, not shipped by default.',
  },
  {
    kind: 'rive',
    title: 'Rive',
    blurb: 'No .riv is commissioned, so this is what a build set to rive shows today.',
  },
];

/** The six states, as the orchestrator drives them in a real session. */
const COMPARE: readonly CellSpec[] = [
  { caption: 'idle', state: 'idle', note: 'between turns' },
  { caption: 'listening', state: 'listening', note: 'the learner is talking' },
  { caption: 'thinking', state: 'thinking', note: 'end of speech to first audio' },
  { caption: 'speaking', state: 'speaking', mouth: 'speech', note: 'from the analyser' },
  { caption: 'at-whiteboard', state: 'at-whiteboard', gaze: BOARD_GAZE, note: 'the tutor draws' },
  { caption: 'reacting', state: 'idle', reaction: 'smile', note: 'a correct check' },
];

const EXPRESSIONS: readonly CellSpec[] = [
  { caption: 'neutral', state: 'idle', expression: 'neutral' },
  { caption: 'smile', state: 'idle', expression: 'smile', note: 'a correct check' },
  { caption: 'not-quite', state: 'idle', expression: 'not-quite', note: 'a wrong check' },
  { caption: 'curious', state: 'listening', expression: 'curious', note: 'asking back' },
];

const GAZES: readonly CellSpec[] = [
  { caption: 'left', state: 'idle', gaze: { x: -1, y: 0 } },
  { caption: 'centre', state: 'idle', gaze: { x: 0, y: 0 } },
  { caption: 'board', state: 'at-whiteboard', gaze: BOARD_GAZE, note: 'x 0.85, y 0.15' },
  { caption: 'up', state: 'idle', gaze: { x: 0, y: -1 } },
  { caption: 'down', state: 'idle', gaze: { x: 0, y: 1 } },
];

const LEVELS: readonly CellSpec[] = [
  { caption: 'silent', state: 'speaking', mouth: 0, note: 'level 0.00' },
  { caption: 'small', state: 'speaking', mouth: 0.18, note: 'level 0.18' },
  { caption: 'mid', state: 'speaking', mouth: 0.45, note: 'level 0.45' },
  { caption: 'loud', state: 'speaking', mouth: 0.85, note: 'level 0.85' },
  { caption: 'live speech', state: 'speaking', mouth: 'speech', note: 'syllable envelope' },
];

const REACTIONS: readonly CellSpec[] = [
  { caption: 'react smile', state: 'idle', reaction: 'smile', note: 'loops every 2.6 s' },
  { caption: 'react not-quite', state: 'idle', reaction: 'not_quite', note: 'loops every 2.6 s' },
];

/** Listening with a level on the channel: the rings answer a voice. */
const LISTEN_LEVEL: readonly CellSpec[] = [
  { caption: 'listening, quiet', state: 'listening', mouth: 0, note: 'level 0.00' },
  { caption: 'listening, voice', state: 'listening', mouth: 'speech', note: 'syllable envelope' },
];

function DetailRow({
  title,
  blurb,
  cells,
  kind,
  reduced,
  still,
}: {
  title: string;
  blurb: string;
  cells: readonly CellSpec[];
  kind: PresenceKind;
  reduced: boolean;
  still: boolean;
}) {
  return (
    <section className="nt-ap-row">
      <header>
        <h2 className="nt-h3">{title}</h2>
        <p className="nt-small">{blurb}</p>
      </header>
      <div className="nt-ap-grid">
        {cells.map((spec) => (
          <CaptionedCell
            key={spec.caption}
            spec={spec}
            kind={kind}
            reduced={reduced}
            still={still}
          />
        ))}
      </div>
    </section>
  );
}

function isDetailRig(value: string | null): value is DetailRig {
  return value === 'presence' || value === 'character';
}

export function AvatarPreview() {
  // Seeded from the query so a screenshot run needs no clicking, and read
  // during the first render rather than in an effect so the buttons below stay
  // the only thing that changes these afterwards.
  const params = useSearchParams();
  const [dark, setDark] = useState(() => params.get('dark') === '1');
  const [reduced, setReduced] = useState(() => params.get('reduced') === '1');
  const [still, setStill] = useState(() => params.get('still') === '1');
  const [rig, setRig] = useState<DetailRig>(() => {
    const wanted = params.get('rig');
    return isDetailRig(wanted) ? wanted : 'presence';
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    return () => document.documentElement.classList.remove('dark');
  }, [dark]);

  // What a build with no NEXT_PUBLIC_TUTOR_PRESENCE set would actually mount.
  const configured = useMemo(() => resolvePresence(), []);

  const detailRows = useMemo(() => {
    const rows = [
      {
        title: 'Expressions',
        blurb: 'Held poses. Every one has to read from across a room.',
        cells: EXPRESSIONS,
      },
      {
        title: 'Gaze',
        blurb:
          rig === 'presence'
            ? 'The form leans and the light inside it slides toward what is happening.'
            : 'Pupils track; the eye highlight stays put.',
        cells: GAZES,
      },
      {
        title: rig === 'presence' ? 'Voice level' : 'Mouth',
        blurb:
          rig === 'presence'
            ? 'The amplitude envelope deforms the lobes and lights the core.'
            : 'Shapes chosen from amplitude, not one hole.',
        cells: LEVELS,
      },
      {
        title: 'Reactions',
        blurb: 'Anticipation, overshoot, settle. Proportionate, never a reward loop.',
        cells: REACTIONS,
      },
    ];
    if (rig === 'presence') {
      rows.splice(3, 0, {
        title: 'Listening rings',
        blurb: 'Outward rings on a calm cadence; their reach lifts with any level on the channel.',
        cells: LISTEN_LEVEL,
      });
    }
    return rows;
  }, [rig]);

  return (
    <main className="nt-ap">
      <header className="nt-ap-head">
        <div>
          <h1 className="nt-h1">What the tutor looks like</h1>
          <p className="nt-small">
            Dev-only contact sheet. Three presences against the same six states. This build is set
            to <code className="nt-ap-code">{configured}</code>; switch with{' '}
            <code className="nt-ap-code">NEXT_PUBLIC_TUTOR_PRESENCE</code> ={' '}
            {PRESENCE_KINDS.join(' | ')}.
          </p>
        </div>
        <div className="nt-ap-controls">
          <button type="button" className="nt-ap-btn" onClick={() => setDark((v) => !v)}>
            {dark ? 'Light surface' : 'Dark surface'}
          </button>
          <button type="button" className="nt-ap-btn" onClick={() => setReduced((v) => !v)}>
            {reduced ? 'Full motion' : 'Reduced motion'}
          </button>
          <button type="button" className="nt-ap-btn" onClick={() => setStill((v) => !v)}>
            {still ? 'Loop reactions' : 'Hold reactions'}
          </button>
        </div>
      </header>

      <section className="nt-ap-row">
        <div className="nt-ap-matrix">
          <div className="nt-ap-corner nt-ap-label">State</div>
          {COLUMNS.map((column) => (
            <div key={column.kind} className="nt-ap-colhead">
              <span className="nt-ap-coltitle">{column.title}</span>
              <span className="nt-ap-note">{column.blurb}</span>
            </div>
          ))}
          {COMPARE.map((spec) => (
            <div className="nt-ap-line" key={spec.caption}>
              <div className="nt-ap-rowhead">
                <span className="nt-ap-caption">{spec.caption}</span>
                {spec.note ? <span className="nt-ap-note">{spec.note}</span> : null}
              </div>
              {COLUMNS.map((column) => (
                <div key={column.kind} className="nt-ap-slot">
                  <AvatarCell spec={spec} kind={column.kind} reduced={reduced} still={still} />
                </div>
              ))}
            </div>
          ))}
        </div>
      </section>

      <section className="nt-ap-row">
        <header>
          <h2 className="nt-h3">At 128 px</h2>
          <p className="nt-small">
            The smallest the tile gets on a phone. Listening, thinking and speaking have to stay
            apart at this size.
          </p>
        </header>
        <div className="nt-ap-small-grid">
          {[COMPARE[1], COMPARE[2], COMPARE[3]].map((spec) =>
            COLUMNS.map((column) => (
              <figure
                className="nt-ap-cell nt-ap-cell-fixed"
                key={`${column.kind}-${spec.caption}`}
              >
                <AvatarCell
                  spec={spec}
                  kind={column.kind}
                  reduced={reduced}
                  still={still}
                  size={128}
                />
                <figcaption>
                  <span className="nt-ap-caption">{spec.caption}</span>
                  <span className="nt-ap-note">{column.title}</span>
                </figcaption>
              </figure>
            )),
          )}
        </div>
      </section>

      <section className="nt-ap-row">
        <header className="nt-ap-detailhead">
          <div>
            <h2 className="nt-h3">In detail</h2>
            <p className="nt-small">Everything the orchestrator can ask of one rig.</p>
          </div>
          <div className="nt-ap-controls">
            {(['presence', 'character'] as const).map((option) => (
              <button
                key={option}
                type="button"
                className="nt-ap-btn"
                aria-pressed={rig === option}
                onClick={() => setRig(option)}
              >
                {option}
              </button>
            ))}
          </div>
        </header>
      </section>

      {detailRows.map((row) => (
        <DetailRow
          key={row.title}
          title={row.title}
          blurb={row.blurb}
          cells={row.cells}
          kind={rig}
          reduced={reduced}
          still={still}
        />
      ))}

      <style>{`
        .nt-ap { padding: 1.5rem 1.75rem 3rem; display: flex; flex-direction: column; gap: 1.5rem; }
        .nt-ap-head { display: flex; flex-wrap: wrap; gap: 1rem; justify-content: space-between; align-items: flex-end; }
        .nt-ap-head p { max-width: 60ch; }
        .nt-ap-code { font-family: var(--font-geist-mono), ui-monospace, monospace; font-size: 0.8125rem;
          background: var(--muted); border-radius: 4px; padding: 0.05rem 0.3rem; }
        .nt-ap-controls { display: flex; gap: 0.5rem; }
        .nt-ap-btn { border: 1px solid var(--border); background: var(--card); color: var(--card-foreground);
          border-radius: var(--radius); padding: 0.5rem 0.75rem; font-size: 0.8125rem; min-height: 2.5rem; }
        .nt-ap-btn[aria-pressed='true'] { background: var(--primary); color: var(--primary-foreground); border-color: var(--primary); }
        .nt-ap-row { display: flex; flex-direction: column; gap: 0.75rem; }
        .nt-ap-row header { display: flex; align-items: baseline; gap: 0.75rem; flex-wrap: wrap; }
        .nt-ap-detailhead { justify-content: space-between; align-items: flex-end; }

        .nt-ap-matrix { display: grid; grid-template-columns: 9.5rem repeat(3, minmax(0, 1fr));
          gap: 0.5rem 0.75rem; align-items: stretch; }
        .nt-ap-corner { align-self: end; padding-bottom: 0.5rem; }
        .nt-ap-colhead { display: flex; flex-direction: column; gap: 0.125rem; padding-bottom: 0.5rem;
          border-bottom: 1px solid var(--border); }
        .nt-ap-coltitle { font-size: 0.9375rem; font-weight: 600; }
        .nt-ap-line { display: grid; grid-column: 1 / -1;
          grid-template-columns: subgrid; align-items: center; }
        .nt-ap-rowhead { display: flex; flex-direction: column; gap: 0.125rem; padding-right: 0.5rem; }
        .nt-ap-slot { border: 1px solid var(--border); border-radius: var(--radius); background: var(--card);
          padding: 0.375rem; }

        .nt-ap-grid { display: grid; gap: 0.75rem; grid-template-columns: repeat(auto-fill, minmax(11rem, 1fr)); }
        .nt-ap-small-grid { display: grid; gap: 0.75rem; grid-template-columns: repeat(3, 8.5rem); width: max-content; }
        .nt-ap-cell { margin: 0; display: flex; flex-direction: column; gap: 0.5rem;
          border: 1px solid var(--border); border-radius: var(--radius); background: var(--card);
          padding: 0.5rem 0.5rem 0.625rem; }
        .nt-ap-cell-fixed { width: max-content; }
        .nt-ap-face { width: 100%; aspect-ratio: 1;
          background: radial-gradient(120% 100% at 50% 0%, var(--nt-brand-soft) 0%, var(--card) 72%);
          border-radius: calc(var(--radius) - 2px); display: flex; align-items: center; justify-content: center; }
        .nt-ap-face > svg { width: 86%; height: 86%; }
        .nt-ap-cell figcaption { display: flex; flex-direction: column; gap: 0.125rem; padding: 0 0.25rem; }
        .nt-ap-caption { font-size: 0.8125rem; font-weight: 600; }
        .nt-ap-note { font-size: 0.75rem; color: var(--muted-foreground); line-height: 1.35; }
      `}</style>
    </main>
  );
}
