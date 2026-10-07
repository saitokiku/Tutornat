'use client';

/**
 * The teaching stage, inside the Kaizen rail.
 *
 * This is the upstream `ClassroomSurface` unmodified — the real scene player,
 * slide/interactive/quiz renderers, narration and the in-lesson tutor chat. It
 * already owns its own load/cancel/stale-epoch handling per `classroomId`, so
 * this route adds navigation and nothing else. The bare `/classroom/[id]`
 * route stays available for the full-viewport presentation.
 */

import { useParams } from 'next/navigation';

import { ClassroomSurface } from '@/components/classroom/ClassroomSurface';
import { KaizenMobileNav, KaizenRail } from '@/components/kaizen/KaizenNav';
import { useKaizenProfile } from '@/components/kaizen/use-kaizen-profile';

export default function KaizenCoursePage() {
  const params = useParams<{ id: string }>();
  const { profile } = useKaizenProfile();

  return (
    <div className="flex h-dvh overflow-hidden bg-background">
      <KaizenRail lang={profile.lang} />
      {/* `pane` keeps the stage inside this layout instead of claiming the
          viewport, which is what leaves room for the rail. */}
      <div className="min-w-0 flex-1 pb-16 lg:pb-0">
        {/* `soloTutor` is the one behavior change from upstream: the lesson
            selects only the stage's teacher, so the learner talks to one
            tutor and the generated peers stay out of the speaking roster. */}
        <ClassroomSurface classroomId={params.id} variant="pane" soloTutor />
      </div>
      <KaizenMobileNav lang={profile.lang} />
    </div>
  );
}
