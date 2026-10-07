'use client';

/**
 * Create a course without reading anything.
 *
 * Three visual steps, all on one screen so there is no wizard to navigate:
 *   1. who you are — tap a figure for your age band (typed age is the backup)
 *   2. what you want — tap a picture (typed topic is the backup)
 *   3. one large go button
 *
 * The handoff is the upstream flow verbatim: write `generationSession` into
 * `sessionStorage` and navigate to `/generation-preview`, which is where the
 * real outline/scene/TTS generation already lives. No generation is
 * reimplemented here, and nothing is faked — if that pipeline fails, the
 * learner sees the upstream preview page's own error, not a pretend course.
 */

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { nanoid } from 'nanoid';
import * as Icons from 'lucide-react';
import { ArrowRight, Baby, Check, Loader2, User, UserRound, X, type LucideIcon } from 'lucide-react';

import { cn } from '@/lib/utils';
import { AGE_BANDS, normalizeAge } from '@/lib/kaizen/client/profile';
import { TOPIC_SEEDS, buildGenerationSession, seedById } from '@/lib/kaizen/client/course-request';
import { clearKaizenOrigin, markKaizenOrigin } from '@/lib/kaizen/client/handoff';
import { strings } from '@/lib/kaizen/client/strings';

import { ReadAloudNote } from './ReadAloudNote';
import { useKaizenProfile } from './use-kaizen-profile';

/** A size ramp so the age row reads as "small person → big person" at a glance. */
const BAND_FIGURE: Record<string, { icon: LucideIcon; size: string }> = {
  'young-child': { icon: Baby, size: 'size-7' },
  child: { icon: UserRound, size: 'size-8' },
  preteen: { icon: UserRound, size: 'size-9' },
  teen: { icon: User, size: 'size-10' },
  adult: { icon: User, size: 'size-11' },
  'older-adult': { icon: User, size: 'size-12' },
};

/** Lucide icon by name, so TOPIC_SEEDS stays plain data. */
function seedIcon(name: string): LucideIcon {
  return ((Icons as unknown as Record<string, LucideIcon>)[name] ?? Icons.Sparkles) as LucideIcon;
}

export function NewCourseFlow() {
  const router = useRouter();
  const { profile, update } = useKaizenProfile();
  const t = strings(profile.lang);

  const [seed, setSeed] = useState<string | null>(null);
  const [typedTopic, setTypedTopic] = useState('');
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  // A typed topic always wins over a tapped tile — it is the more specific ask.
  const topic = useMemo(() => {
    const typed = typedTopic.trim();
    if (typed) return typed;
    const chosen = seed ? seedById(seed) : undefined;
    return chosen ? chosen.label[profile.lang] : '';
  }, [profile.lang, seed, typedTopic]);

  const start = () => {
    if (profile.age == null) return setProblem(t.needAge);
    if (!topic) return setProblem(t.needTopic);
    setProblem(null);
    setBusy(true);
    try {
      const sessionId = nanoid();
      // The upstream preview page reads exactly this key on mount.
      sessionStorage.setItem(
        'generationSession',
        JSON.stringify(buildGenerationSession(topic, profile, sessionId)),
      );
      // Tells the shared preview page which surface to return to. Bound to this
      // session id, so it cannot capture somebody else's generation.
      markKaizenOrigin(sessionId);
      router.push('/generation-preview');
    } catch (error) {
      setBusy(false);
      clearKaizenOrigin();
      // Honest failure: sessionStorage refused, so generation never started.
      setProblem(error instanceof Error ? error.message : t.needTopic);
    }
  };

  /**
   * The escape from the busy state.
   *
   * `start()` cannot clear `busy` on the success path — the route change is
   * what ends this component's life, and clearing it first would re-enable the
   * button mid-navigation. So the busy state needs its own way out rather than
   * a timer: drop the pending handoff and let the learner change their mind.
   * Nothing has been generated yet at this point; the preview page owns
   * aborting anything already in flight.
   */
  const cancel = () => {
    try {
      sessionStorage.removeItem('generationSession');
    } catch {
      /* storage refused — there is nothing to remove */
    }
    clearKaizenOrigin();
    setBusy(false);
  };

  return (
    <div className="flex flex-col gap-10">
      {/* ─── Step 1: age, as figures ─────────────────────────────────── */}
      <section aria-labelledby="kz-age" className="flex flex-col gap-3">
        <h2 id="kz-age" className="text-lg font-semibold">
          {t.howOld}
        </h2>
        <div className="flex flex-wrap gap-3">
          {AGE_BANDS.map((band) => {
            const { icon: Figure, size } = BAND_FIGURE[band.id];
            const active = profile.age != null && profile.age >= band.min && profile.age <= band.max;
            return (
              <button
                key={band.id}
                type="button"
                onClick={() => update({ age: band.report })}
                aria-pressed={active}
                className={cn(
                  'relative flex min-h-[7.5rem] w-[7.5rem] flex-col items-center justify-end gap-2 rounded-[14px] border-2 bg-card p-3 transition-colors',
                  active ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/40',
                )}
              >
                <Figure aria-hidden className={cn(size, active ? 'text-primary' : 'text-foreground')} />
                {/* Numbers, not sentences — digits survive low literacy better. */}
                <span className="font-mono text-xs tabular-nums text-muted-foreground">
                  {band.min}–{band.max}
                </span>
                <span className="text-center text-xs font-medium leading-tight">
                  {t.bands[band.id as keyof typeof t.bands]}
                </span>
                {active ? (
                  <Check
                    aria-hidden
                    className="absolute top-2 right-2 size-5 rounded-full bg-primary p-0.5 text-primary-foreground"
                  />
                ) : null}
              </button>
            );
          })}
        </div>
        {/* Typed backup, never the primary path. */}
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          {t.typeAge}
          <input
            type="number"
            inputMode="numeric"
            min={2}
            max={120}
            value={profile.age ?? ''}
            onChange={(event) => update({ age: normalizeAge(event.target.value) })}
            className="h-11 w-24 rounded-[10px] border border-border bg-card px-3 text-center font-mono tabular-nums text-foreground"
          />
        </label>
      </section>

      {/* ─── Step 2: topic, as pictures ──────────────────────────────── */}
      <section aria-labelledby="kz-topic" className="flex flex-col gap-3">
        <h2 id="kz-topic" className="text-lg font-semibold">
          {t.pickTopic}
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {TOPIC_SEEDS.map((item) => {
            const Icon = seedIcon(item.icon);
            const active = seed === item.id && !typedTopic.trim();
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setSeed(item.id);
                  setTypedTopic('');
                  setProblem(null);
                }}
                aria-pressed={active}
                className={cn(
                  'flex min-h-[8.5rem] flex-col items-center justify-center gap-3 rounded-[14px] border-2 bg-card p-4 text-center transition-colors',
                  active ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/40',
                )}
              >
                <Icon aria-hidden className={cn('size-10', active ? 'text-primary' : 'text-foreground')} />
                <span className="text-sm font-medium leading-tight">{item.label[profile.lang]}</span>
              </button>
            );
          })}
        </div>
        <ReadAloudNote text={t.orType} />
        <label className="flex flex-col gap-1.5">
          <span className="sr-only">{t.orType}</span>
          <input
            type="text"
            value={typedTopic}
            onChange={(event) => {
              setTypedTopic(event.target.value);
              setProblem(null);
            }}
            placeholder={t.typePlaceholder}
            className="h-12 rounded-[10px] border border-border bg-card px-4 text-base"
          />
        </label>
      </section>

      {/* ─── Step 3: go ──────────────────────────────────────────────── */}
      <section className="flex flex-col gap-3">
        {problem ? (
          <div className="flex flex-wrap items-center gap-2 rounded-[14px] border border-destructive/25 bg-destructive/10 px-4 py-3">
            <p className="text-sm font-medium text-destructive">{problem}</p>
          </div>
        ) : null}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:self-start">
          <button
            type="button"
            onClick={start}
            disabled={busy}
            aria-busy={busy}
            className="inline-flex min-h-14 w-full items-center justify-center gap-3 rounded-full bg-primary px-8 text-lg font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60 sm:w-auto"
          >
            {busy ? (
              <Loader2 aria-hidden className="size-6 animate-spin" />
            ) : (
              <ArrowRight aria-hidden className="size-6" />
            )}
            {busy ? t.makeBusy : t.make}
          </button>
          {/* The way out of the spinner. Only while busy, so there is no extra
              control to read on the normal path. */}
          {busy ? (
            <button
              type="button"
              onClick={cancel}
              className="inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-full border-2 border-border px-6 text-base font-semibold transition-colors hover:border-primary/40 sm:w-auto"
            >
              <X aria-hidden className="size-5" />
              {t.cancelBusy}
            </button>
          ) : null}
        </div>
      </section>
    </div>
  );
}
