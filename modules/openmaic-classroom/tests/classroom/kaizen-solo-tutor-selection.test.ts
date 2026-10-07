/**
 * Kaizen runs ONE learner-facing tutor.
 *
 * A generated classroom roster is a teacher plus peers (stage artist,
 * background coach, classmates). In the bare `/classroom/[id]` route and the
 * workbench those peers are co-speakers by design — the director calls them
 * with `call_agent` and each gets its own `agent_start`. In the Kaizen lesson
 * they must not be competing classmate voices: the learner talks to the
 * teacher, and the teacher alone speaks.
 *
 * The narrowing happens where every classroom load already decides its
 * roster — `restoreAgentSelection` — so the single selected id flows through
 * the existing request path (`config.agentIds` -> `resolveAgentConfigs` ->
 * the `call_agent` roster), and peers are excluded from what the director can
 * call at all, not merely discouraged in a prompt.
 */
import { describe, it, expect } from 'vitest';
import {
  restoreAgentSelection,
  type AgentSelection,
} from '@/lib/orchestration/registry/agent-selection';

const PRESETS = new Set(['default-1', 'default-2', 'default-3', 'default-4']);
const isPresetAgent = (id: string) => PRESETS.has(id);

/** The materialized lesson roster shape: one teacher, two peers. */
const ROLES: Record<string, string> = {
  'gen-teacher': 'teacher',
  'gen-artist': 'assistant',
  'gen-peer': 'student',
};
const getAgentRole = (id: string) => ROLES[id];

const GENERATED = ['gen-artist', 'gen-teacher', 'gen-peer'];
const STAGE_DEFAULTS: AgentSelection = {
  mode: 'auto',
  selectedAgentIds: GENERATED,
};

describe('restoreAgentSelection — Kaizen single tutor', () => {
  it('narrows a generated roster to exactly the teacher id', () => {
    expect(
      restoreAgentSelection({
        persisted: { mode: 'preset', selectedAgentIds: [] },
        persistedIsUserSet: false,
        generatedAgentIds: GENERATED,
        isPresetAgent,
        getAgentRole,
        soloTutor: true,
      }),
    ).toEqual({ selection: { mode: 'auto', selectedAgentIds: ['gen-teacher'] }, isUserSet: false });
  });

  it('overrides a carried-over user selection — Kaizen is never multi-voice', () => {
    // A user who picked the full roster in the workbench must not drag peers
    // into the Kaizen lesson on the next load.
    expect(
      restoreAgentSelection({
        persisted: { mode: 'auto', selectedAgentIds: GENERATED },
        persistedIsUserSet: true,
        generatedAgentIds: GENERATED,
        isPresetAgent,
        getAgentRole,
        soloTutor: true,
      }).selection,
    ).toEqual({ mode: 'auto', selectedAgentIds: ['gen-teacher'] });

    expect(
      restoreAgentSelection({
        persisted: { mode: 'preset', selectedAgentIds: ['default-1', 'default-2'] },
        persistedIsUserSet: true,
        generatedAgentIds: GENERATED,
        isPresetAgent,
        getAgentRole,
        soloTutor: true,
      }).selection.selectedAgentIds,
    ).toEqual(['gen-teacher']);
  });

  it('picks the teacher by registry role, not by position or name', () => {
    expect(
      restoreAgentSelection({
        persisted: { mode: 'preset', selectedAgentIds: [] },
        persistedIsUserSet: false,
        // teacher last: a positional pick would choose the artist.
        generatedAgentIds: ['gen-artist', 'gen-peer', 'gen-teacher'],
        isPresetAgent,
        getAgentRole,
        soloTutor: true,
      }).selection.selectedAgentIds,
    ).toEqual(['gen-teacher']);
  });

  it('falls back to the preset teacher when the stage has no generated roster', () => {
    expect(
      restoreAgentSelection({
        persisted: { mode: 'preset', selectedAgentIds: [] },
        persistedIsUserSet: false,
        generatedAgentIds: [],
        stageAgentIds: ['default-1', 'default-2', 'default-3'],
        isPresetAgent,
        getAgentRole: (id) => (id === 'default-1' ? 'teacher' : 'student'),
        soloTutor: true,
      }).selection,
    ).toEqual({ mode: 'preset', selectedAgentIds: ['default-1'] });
  });

  it('fails honestly rather than promoting a peer when no teacher exists', () => {
    // No role lookup resolves to `teacher`. Picking `generatedAgentIds[0]`
    // here would silently make the stage artist the tutor; an empty selection
    // surfaces as a request error instead of a wrong-voice lesson.
    expect(
      restoreAgentSelection({
        persisted: { mode: 'preset', selectedAgentIds: [] },
        persistedIsUserSet: false,
        generatedAgentIds: ['gen-artist', 'gen-peer'],
        isPresetAgent,
        getAgentRole,
        soloTutor: true,
      }).selection.selectedAgentIds,
    ).toEqual([]);
  });

  it('takes the first teacher when a malformed roster carries several', () => {
    expect(
      restoreAgentSelection({
        persisted: { mode: 'preset', selectedAgentIds: [] },
        persistedIsUserSet: false,
        generatedAgentIds: ['gen-teacher', 'gen-teacher-2'],
        isPresetAgent,
        getAgentRole: () => 'teacher',
        soloTutor: true,
      }).selection.selectedAgentIds,
    ).toEqual(['gen-teacher']);
  });
});

describe('restoreAgentSelection — upstream multi-agent mode preserved', () => {
  it('keeps the whole generated roster without the flag', () => {
    expect(
      restoreAgentSelection({
        persisted: { mode: 'preset', selectedAgentIds: [] },
        persistedIsUserSet: false,
        generatedAgentIds: GENERATED,
        isPresetAgent,
        getAgentRole,
      }),
    ).toEqual({ selection: STAGE_DEFAULTS, isUserSet: false });
  });

  it('still honors a user-set selection without the flag', () => {
    const persisted: AgentSelection = { mode: 'auto', selectedAgentIds: ['gen-artist', 'gen-peer'] };
    expect(
      restoreAgentSelection({
        persisted,
        persistedIsUserSet: true,
        generatedAgentIds: GENERATED,
        isPresetAgent,
        getAgentRole,
      }),
    ).toEqual({ selection: persisted, isUserSet: true });
  });

  it('is unchanged when callers omit the role lookup entirely', () => {
    expect(
      restoreAgentSelection({
        persisted: { mode: 'preset', selectedAgentIds: [] },
        persistedIsUserSet: false,
        generatedAgentIds: GENERATED,
        isPresetAgent,
      }),
    ).toEqual({ selection: STAGE_DEFAULTS, isUserSet: false });
  });
});
