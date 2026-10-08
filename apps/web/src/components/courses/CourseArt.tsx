"use client";

import { KaizenMark } from "@/components/brand";
import { SUBJECT_TINT as TINT } from "@/components/ui";
import { FractionVisual, LineGraphVisual, MoonVisual, NumberLineVisual, ParticlesVisual } from "@/components/stage/visuals";
import { ArrayVisual, BaseTenVisual, DotsVisual, TenFrameVisual } from "@/components/stage/visuals-practice";
import type { Lesson, Subject, Visual, Widget } from "@/lib/types";

/** The first picture a course actually teaches with, so its cover shows the real idea. */
function firstPicture(lessons: Lesson[]): Visual | Widget | null {
  for (const l of lessons)
    for (const s of l.scenes) {
      if (s.kind === "slide") {
        const v = s.blocks.find((b) => b.type === "visual");
        if (v?.type === "visual") return v.visual;
      }
      if (s.kind === "interactive") return s.widget;
    }
  return null;
}

/**
 * Course cover drawn from the course's own visuals: a fraction bar, the Moon, particles, a number line,
 * a graph, counters, base-ten blocks, an array, or sorting cards. Decorative next to the title, so it is
 * hidden from screen readers.
 */
export function CourseArt({ lessons, subject, size = "md" }: { lessons: Lesson[]; subject: Subject; size?: "sm" | "md" | "lg" }) {
  const tint = TINT[subject];
  const pic = firstPicture(lessons);
  const box = { sm: "size-12 rounded-sm p-1.5", md: "aspect-[4/3] w-full rounded-md p-4", lg: "aspect-[4/3] w-full rounded-lg p-6" }[size];
  let art: React.ReactNode;
  switch (pic?.kind) {
    case "fraction":
    case "fraction-bar": {
      // The course's own fraction (a bar's target when it has one); a whole or empty bar falls back to 3/4.
      const f = pic.kind === "fraction-bar" && pic.target ? pic.target : pic;
      const own = f.shaded > 0 && f.shaded < f.parts;
      art = <FractionVisual parts={own ? f.parts : 4} shaded={own ? f.shaded : 3} alt="" tint={tint} />;
      break;
    }
    case "number-line": {
      const marker = "target" in pic && pic.target !== undefined ? pic.target : (pic.max + pic.min) / 2;
      const marks = [pic.min, (pic.min + pic.max) / 2, pic.max];
      art = <NumberLineVisual min={pic.min} max={pic.max} marks={marks} denominator={pic.denominator} alt="" tint={tint} marker={marker} />;
      break;
    }
    case "particles":
      art = <ParticlesVisual state={pic.state} alt="" tint={tint} />;
      break;
    case "states-of-matter":
      art = <ParticlesVisual state="liquid" alt="" tint={tint} />;
      break;
    case "moon":
    case "moon-phases":
      art = (
        <span className="flex items-center justify-center gap-[6%]">
          {[0.15, 0.3, 0.5].map((p) => (
            <span key={p} className="w-[28%]">
              <MoonVisual phase={p} alt="" />
            </span>
          ))}
        </span>
      );
      break;
    case "line-graph":
      art = <LineGraphVisual points={pic.points} xLabel="" yLabel="" alt="" tint={tint} />;
      break;
    case "dots":
      art = <DotsVisual groups={pic.groups} crossed={pic.crossed} alt="" tint={tint} />;
      break;
    case "ten-frame":
      art = <TenFrameVisual filled={pic.filled} frames={pic.frames} alt="" tint={tint} />;
      break;
    case "base-ten":
      art = <BaseTenVisual hundreds={pic.hundreds} tens={pic.tens} ones={pic.ones} alt="" tint={tint} />;
      break;
    case "array":
      art = <ArrayVisual rows={pic.rows} cols={pic.cols} alt="" tint={tint} />;
      break;
    case "sorter":
      art = <Cards tint={tint} n={Math.min(3, pic.categories.length)} />;
      break;
    default:
      art = subject === "other" ? <KaizenMark size={size === "sm" ? 28 : 56} /> : <Cards tint={tint} n={3} />;
  }
  return (
    <span
      aria-hidden="true"
      className={`grid shrink-0 place-items-center overflow-hidden [&_svg]:h-auto [&_svg]:max-h-full [&_svg]:w-full ${box}`}
      style={{ background: `color-mix(in srgb, ${tint} 9%, var(--color-panel2))` }}
    >
      {art}
    </span>
  );
}

/** Sorting cards: a few labelled stacks, for reading and writing courses. */
function Cards({ tint, n }: { tint: string; n: number }) {
  return (
    <svg viewBox="0 0 120 80" className="w-full">
      {Array.from({ length: n }, (_, i) => {
        const x = 8 + i * (104 / n);
        const w = 104 / n - 8;
        return (
          <g key={i}>
            <rect x={x} y={14} width={w} height={54} rx={6} fill="var(--color-panel)" stroke="var(--color-border)" />
            <rect x={x + 6} y={22} width={w - 12} height={6} rx={3} fill={tint} opacity={0.85} />
            <rect x={x + 6} y={34} width={w - 18} height={4} rx={2} fill="var(--color-border)" />
            <rect x={x + 6} y={43} width={w - 12} height={4} rx={2} fill="var(--color-border)" />
            <rect x={x + 6} y={52} width={w - 22} height={4} rx={2} fill="var(--color-border)" />
          </g>
        );
      })}
    </svg>
  );
}
