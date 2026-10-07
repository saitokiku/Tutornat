'use client';

/**
 * The catalogue. Real stored courses or an honest empty/error state.
 *
 * Data is the upstream pair `listStages()` + `getFirstSlideByStages()` against
 * `/api/stages` and the real document store — nothing is mocked and no fixture
 * course is ever displayed. Consequently: zero stored courses renders the empty
 * state, and a failing read renders the error state with a retry. Neither is
 * padded with sample tiles.
 *
 * Loads are gated by `createLatestGate` so a refresh that is superseded (retry,
 * library-changed event, unmount) cannot land its result over a newer one.
 */

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import type { Slide } from '@openmaic/dsl';
import { AlertTriangle, Loader2, Plus, Sparkles } from 'lucide-react';

import {
  LIBRARY_CHANGED_EVENT,
  getFirstSlideByStages,
  listStages,
  revokeThumbnailSlideMediaUrls,
  type StageListItem,
} from '@/lib/utils/stage-storage';
import { createLatestGate } from '@/lib/kaizen/client/stale';
import type { KaizenLang } from '@/lib/kaizen/client/profile';
import { strings } from '@/lib/kaizen/client/strings';

import { CourseTile } from './CourseTile';
import { ReadAloudNote } from './ReadAloudNote';

type Status = 'loading' | 'ready' | 'error';

export function CourseCatalogue({ lang }: { readonly lang: KaizenLang }) {
  const t = strings(lang);
  const [status, setStatus] = useState<Status>('loading');
  const [courses, setCourses] = useState<StageListItem[]>([]);
  const [slides, setSlides] = useState<Record<string, Slide>>({});
  // Created once per mount. In state rather than `useRef(...).current` because
  // reading a ref during render is not allowed; the value never changes, so
  // this never triggers a re-render.
  const [gate] = useState(createLatestGate);
  // Thumbnails hold blob URLs; upstream revokes them on replace and unmount.
  const slidesRef = useRef<Record<string, Slide>>({});

  /**
   * Shaped like upstream's `loadClassrooms` in `app/page.tsx`: a plain async
   * function, invoked from a mount effect and from the library-changed event.
   *
   * Status is never written synchronously — the initial state is already
   * `loading`, a retry sets it from its own click handler, and a background
   * refresh keeps the current list on screen rather than flashing a spinner.
   * Every write below happens after an await, gated on still being newest.
   */
  const load = async () => {
    const current = gate.begin();
    try {
      const list = await listStages();
      if (!current()) return;
      // Newest first: continuing the most recent course is the common case.
      const sorted = [...list].sort((a, b) => b.updatedAt - a.updatedAt);
      setCourses(sorted);
      setStatus('ready');

      const next = await getFirstSlideByStages(sorted.map((c) => c.id));
      if (!current()) {
        revokeThumbnailSlideMediaUrls(next);
        return;
      }
      const previous = slidesRef.current;
      slidesRef.current = next;
      setSlides(next);
      // Deferred so React has dropped the old <img>/<video> srcs first.
      window.setTimeout(() => revokeThumbnailSlideMediaUrls(previous), 0);
    } catch {
      if (current()) setStatus('error');
    }
  };

  useEffect(() => {
    void load();
    // Upstream fires this whenever a course is saved, renamed or deleted.
    const onChange = () => void load();
    window.addEventListener(LIBRARY_CHANGED_EVENT, onChange);
    const held = slidesRef;
    return () => {
      window.removeEventListener(LIBRARY_CHANGED_EVENT, onChange);
      gate.cancelAll();
      revokeThumbnailSlideMediaUrls(held.current);
    };
    // Mount-only, like upstream's library effect: `gate` is stable and `load`
    // is only ever called through these two handlers.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (status === 'loading') {
    return (
      <div className="flex flex-col items-center gap-3 py-20 text-muted-foreground">
        <Loader2 aria-hidden className="size-8 animate-spin" />
        <p className="text-sm">{t.loading}</p>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="flex flex-col items-center gap-4 rounded-[14px] border border-destructive/25 bg-destructive/10 px-6 py-14 text-center">
        <AlertTriangle aria-hidden className="size-10 text-destructive" />
        <p className="text-lg font-semibold">{t.errorTitle}</p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setStatus('loading');
              void load();
            }}
            className="inline-flex min-h-11 items-center rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
          >
            {t.retry}
          </button>
        </div>
      </div>
    );
  }

  if (courses.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-[14px] border border-border bg-card px-6 py-16 text-center">
        <Sparkles aria-hidden className="size-12 text-primary" />
        <p className="text-xl font-semibold">{t.emptyTitle}</p>
        <p className="max-w-prose text-sm text-muted-foreground">{t.emptyBody}</p>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Link
            href="/kaizen/new"
            className="inline-flex min-h-12 items-center gap-2 rounded-full bg-primary px-6 text-base font-semibold text-primary-foreground hover:bg-primary/90"
          >
            <Plus aria-hidden className="size-5" />
            {t.newCourse}
          </Link>
        </div>
        <ReadAloudNote text={t.emptyBody} />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-x-5 gap-y-8 sm:grid-cols-2 xl:grid-cols-3">
      {courses.map((course) => (
        <CourseTile key={course.id} course={course} slide={slides[course.id]} lang={lang} />
      ))}
    </div>
  );
}
