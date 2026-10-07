'use client';

/**
 * The catalogue is the home of the Kaizen surface: what you already made,
 * biggest first, with one button to make something new.
 */

import Link from 'next/link';
import { Plus } from 'lucide-react';

import { CourseCatalogue } from '@/components/kaizen/CourseCatalogue';
import { KaizenShell } from '@/components/kaizen/KaizenShell';
import { useKaizenProfile } from '@/components/kaizen/use-kaizen-profile';
import { strings } from '@/lib/kaizen/client/strings';

export default function KaizenCataloguePage() {
  const { profile } = useKaizenProfile();
  const t = strings(profile.lang);

  return (
    <KaizenShell title={t.savedCourses} note={t.emptyBody}>
      <div className="mb-6">
        <Link
          href="/kaizen/new"
          className="inline-flex min-h-12 items-center gap-2 rounded-full bg-primary px-6 text-base font-semibold text-primary-foreground hover:bg-primary/90"
        >
          <Plus aria-hidden className="size-5" />
          {t.newCourse}
        </Link>
      </div>
      <CourseCatalogue lang={profile.lang} />
    </KaizenShell>
  );
}
