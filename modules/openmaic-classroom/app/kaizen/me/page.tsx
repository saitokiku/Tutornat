'use client';

/**
 * The learner's own page: nickname, age, language.
 *
 * It states plainly that nothing is being scored. There is no progress ring, no
 * streak and no mastery figure, because none of those would be backed by
 * evidence — `updatedAt` is the only real signal this app has, and it means
 * "opened", which the catalogue already shows.
 */

import { ShieldCheck } from 'lucide-react';

import { KaizenShell } from '@/components/kaizen/KaizenShell';

import { useKaizenProfile } from '@/components/kaizen/use-kaizen-profile';
import { AGE_BANDS, normalizeAge } from '@/lib/kaizen/client/profile';
import { strings } from '@/lib/kaizen/client/strings';
import { cn } from '@/lib/utils';

export default function KaizenLearnerPage() {
  const { profile, update } = useKaizenProfile();
  const t = strings(profile.lang);

  return (
    <KaizenShell title={t.learner} note={t.nicknameHint}>
      <div className="flex max-w-prose flex-col gap-8">
        <section className="flex flex-col gap-2">
          <label htmlFor="kz-nick" className="text-lg font-semibold">
            {t.nickname}{' '}
            <span className="text-sm font-normal text-muted-foreground">({t.nicknameOptional})</span>
          </label>
          <input
            id="kz-nick"
            type="text"
            value={profile.nickname}
            maxLength={40}
            onChange={(event) => update({ nickname: event.target.value })}
            className="h-12 rounded-[10px] border border-border bg-card px-4 text-base"
          />
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <ShieldCheck aria-hidden className="size-4 shrink-0 text-primary" />
            {t.nicknameHint}
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold">{t.howOld}</h2>
          <div className="flex flex-wrap gap-2">
            {AGE_BANDS.map((band) => {
              const active =
                profile.age != null && profile.age >= band.min && profile.age <= band.max;
              return (
                <button
                  key={band.id}
                  type="button"
                  onClick={() => update({ age: band.report })}
                  aria-pressed={active}
                  className={cn(
                    'min-h-11 rounded-full border-2 px-4 text-sm font-semibold transition-colors',
                    active
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border hover:border-primary/40',
                  )}
                >
                  {t.bands[band.id as keyof typeof t.bands]}
                </button>
              );
            })}
          </div>
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            {t.typeAge}
            <input
              type="number"
              inputMode="numeric"
              min={2}
              max={120}
              value={profile.age ?? ''}
              onChange={(event) => update({ age: normalizeAge(event.target.value) })}
              className="h-11 w-24 rounded-[10px] border border-border bg-card px-3 text-center font-mono tabular-nums"
            />
          </label>
        </section>

        <section className="flex flex-col gap-2 rounded-[14px] border border-border bg-card p-5">
          <h2 className="text-base font-semibold">{t.noProgressTitle}</h2>
          <p className="text-sm text-muted-foreground">{t.noProgressBody}</p>
        </section>
      </div>
    </KaizenShell>
  );
}
