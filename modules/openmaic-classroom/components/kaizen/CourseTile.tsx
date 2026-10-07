'use client';

/**
 * One saved course, as a picture.
 *
 * The thumbnail is the real first slide of the real stored course, rendered by
 * the upstream `SlideThumbnail` (`@openmaic/renderer`) — the same component the
 * upstream home page uses. That matters for the low-literacy goal: the tile
 * shows what the course actually looks like rather than a generic icon, so it
 * is recognisable without reading the title.
 *
 * When a course has no slide yet, the fallback is a plain neutral frame, not a
 * fake preview. The title is still shown as text beneath it.
 */

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Slide } from '@openmaic/dsl';
import { ImageOff, Play } from 'lucide-react';

import { SlideThumbnail } from '@/components/slide-renderer/SlideThumbnail';
import { cn } from '@/lib/utils';
import type { StageListItem } from '@/lib/utils/stage-storage';
import type { KaizenLang } from '@/lib/kaizen/client/profile';
import { strings } from '@/lib/kaizen/client/strings';

export function CourseTile({
  course,
  slide,
  lang,
}: {
  readonly course: StageListItem;
  readonly slide: Slide | undefined;
  readonly lang: KaizenLang;
}) {
  const router = useRouter();
  const t = strings(lang);
  const frameRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  // `SlideThumbnail` needs a pixel size to scale the slide into. Measured the
  // same way upstream does on the home page.
  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(frame);
    return () => observer.disconnect();
  }, []);

  // Keeps the rail/mobile nav around the stage; `/classroom/[id]` remains the
  // full-viewport presentation route.
  const open = () => router.push(`/kaizen/course/${course.id}`);
  // Was it ever opened after being made? `updatedAt` only moves on a real
  // save, so this is an honest "touched" signal and not a progress score.
  const resumable = course.updatedAt > course.createdAt;

  return (
    <div className="group flex flex-col gap-3">
      {/* The whole picture is the button — the largest possible target. */}
      <button
        type="button"
        onClick={open}
        aria-label={`${resumable ? t.continue : t.start}: ${course.name}`}
        className="relative aspect-[16/9] w-full overflow-hidden rounded-[14px] border border-border bg-muted text-left transition-transform duration-200 hover:scale-[1.02] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        <div ref={frameRef} className="absolute inset-0">
          {slide && width > 0 ? (
            <SlideThumbnail
              slide={slide}
              size={width}
              viewportSize={slide.viewportSize ?? 1000}
              viewportRatio={slide.viewportRatio ?? 0.5625}
              sceneId={course.id}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              {/* No invented preview: an explicit "no picture yet" frame. */}
              <ImageOff aria-hidden className="size-8 text-muted-foreground/40" />
            </div>
          )}
        </div>
        {/* Play affordance, so "this is something you watch" reads without text. */}
        <span
          aria-hidden
          className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/20"
        >
          <span className="flex size-14 items-center justify-center rounded-full bg-background/90 opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
            <Play className="size-6 translate-x-0.5 fill-current" />
          </span>
        </span>
      </button>

      <div className="min-w-0">
        <p className="truncate text-sm font-semibold">{course.name}</p>
        <p className="font-mono text-xs tabular-nums text-muted-foreground">
          {course.sceneCount} {t.scenes}
        </p>
      </div>

      <button
        type="button"
        onClick={open}
        className={cn(
          'inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-5 text-sm font-semibold transition-colors',
          'bg-primary text-primary-foreground hover:bg-primary/90',
        )}
      >
        <Play aria-hidden className="size-4 fill-current" />
        {resumable ? t.continue : t.start}
      </button>
    </div>
  );
}
