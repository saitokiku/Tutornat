'use client';

import type { AgeBand } from '@/kaizen.config';
import { checkStartSelection, plannerApi, tutorApi } from '@/lib/tutor/client';
import type { SessionTopic, TutorSession } from '@/lib/tutor/contracts';

import { useLoad } from '@/components/tutor/ui/use-load';

import { CourseworkManager } from './coursework';
import { Planner } from './planner';
import { ProgressPanel } from './progress';
import { RecentSessions } from './recent-sessions';
import { StartCard, useRememberedMode, useSessionStarter } from './start-session';

/**
 * The live sections of /learn, in the order they are used (D35): start,
 * planner, homework, recent sessions, progress. Coursework, the planner and
 * progress are loaded once here and shared, so every "start" on the page
 * goes through the same starter and the same voice-or-text choice.
 */
export function LearnerWorkspace({
  band,
  remainingMinutes,
  blockedReason,
  sessions,
}: {
  band: AgeBand | null;
  remainingMinutes: number;
  blockedReason: string | null;
  sessions: TutorSession[];
}) {
  const coursework = useLoad(tutorApi.listCoursework);
  const planner = useLoad(plannerApi.list);
  const progress = useLoad(tutorApi.getProgress);
  const items = coursework.result?.ok ? coursework.result.data.items : [];
  const nextSkill = progress.result?.ok ? progress.result.data.nextSkill : null;
  const hasMastery = progress.result?.ok ? progress.result.data.mastery.length > 0 : false;

  const starter = useSessionStarter();
  const [mode, setMode] = useRememberedMode();
  const canStart = !blockedReason;

  /** Start straight from a piece of homework. */
  function startOnCoursework(id: string) {
    if (!canStart) return;
    const checked = checkStartSelection({
      source: 'coursework',
      courseworkId: id,
      skillId: null,
      mode,
    });
    if (checked.ok) void starter.start(checked.body);
  }

  /** Start a topic session from a planner item, exactly as the start card would. */
  function startOnTopic(topic: SessionTopic) {
    if (!canStart) return;
    const checked = checkStartSelection({
      source: 'topic',
      topic,
      courseworkId: null,
      skillId: null,
      mode,
    });
    if (checked.ok) void starter.start(checked.body);
  }

  return (
    <>
      <StartCard
        items={items}
        nextSkill={nextSkill}
        hasMastery={hasMastery}
        progressLoading={progress.loading}
        band={band}
        remainingMinutes={remainingMinutes}
        blockedReason={blockedReason}
        mode={mode}
        onModeChange={setMode}
        starter={starter}
        onStartCoursework={startOnCoursework}
      />
      <Planner
        loaded={planner}
        onStartTopic={startOnTopic}
        starting={starter.busy}
        canStart={canStart}
      />
      <CourseworkManager
        loaded={coursework}
        onStart={startOnCoursework}
        starting={starter.busy}
        canStart={canStart}
      />
      <RecentSessions sessions={sessions} />
      <ProgressPanel loaded={progress} />
    </>
  );
}
