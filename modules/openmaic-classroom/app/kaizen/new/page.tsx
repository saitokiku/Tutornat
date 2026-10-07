'use client';

import { KaizenShell } from '@/components/kaizen/KaizenShell';
import { NewCourseFlow } from '@/components/kaizen/NewCourseFlow';
import { useKaizenProfile } from '@/components/kaizen/use-kaizen-profile';
import { strings } from '@/lib/kaizen/client/strings';

export default function KaizenNewCoursePage() {
  const { profile } = useKaizenProfile();
  const t = strings(profile.lang);

  return (
    <KaizenShell title={t.newCourse} note={`${t.howOld} ${t.pickTopic}`}>
      <NewCourseFlow />
    </KaizenShell>
  );
}
