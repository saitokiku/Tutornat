export interface AgentSelection {
  mode: 'preset' | 'auto';
  selectedAgentIds: string[];
}

export interface RestoredAgentSelection {
  selection: AgentSelection;
  /** Whether `selection` is the user's explicit choice (vs stage-derived defaults). */
  isUserSet: boolean;
}

/**
 * Decide the agent mode/selection to apply when a classroom loads.
 *
 * Only an explicit user choice (made in the AgentBar, `persistedIsUserSet`)
 * may carry across classrooms — and only while it is still valid for the
 * loaded stage: a preset selection of known non-generated agents, or an auto
 * selection drawn from this stage's generated agents. Stage-derived defaults
 * written by previous classroom loads are NOT user choices and must never be
 * re-read as one, or visiting a preset classroom would permanently downgrade
 * every auto classroom to preset agents.
 *
 * The fallback reproduces the previous unconditional behavior: auto with all
 * generated agents when the stage has them, else the stage's preset agents,
 * else the default trio.
 */
export function restoreAgentSelection(params: {
  persisted: AgentSelection;
  persistedIsUserSet: boolean;
  generatedAgentIds: string[];
  stageAgentIds?: string[];
  isPresetAgent: (id: string) => boolean;
  /** Registry role of an agent id (`'teacher' | 'assistant' | 'student'`). */
  getAgentRole?: (id: string) => string | undefined;
  /**
   * This host runs ONE learner-facing tutor (the Kaizen lesson). The roster is
   * narrowed to the single `teacher` agent before it reaches
   * `config.agentIds`, so the server resolves one agent config and the
   * director's `call_agent` roster physically cannot reach a peer — the stage
   * artist and background coach stay as tools the tutor uses, not as
   * competing classmate voices. No persisted choice may widen it: the Kaizen
   * route has no roster UI, and a selection carried over from the workbench
   * must not drag peers into the lesson.
   *
   * Omitted (the default) is upstream behavior: every selected agent speaks.
   */
  soloTutor?: boolean;
}): RestoredAgentSelection {
  const {
    persisted,
    persistedIsUserSet,
    generatedAgentIds,
    stageAgentIds,
    isPresetAgent,
    getAgentRole,
    soloTutor,
  } = params;

  if (soloTutor) {
    // Pick by registry role, never by position: a generated roster is not
    // ordered teacher-first, so `[0]` would hand the lesson to the stage
    // artist. With no teacher the selection stays EMPTY and the request
    // fails loudly at the route's agentIds validation — promoting a peer
    // would ship exactly the wrong-voice bug this narrowing exists to fix.
    const pool = generatedAgentIds.length > 0 ? generatedAgentIds : (stageAgentIds ?? []);
    const mode: AgentSelection['mode'] = generatedAgentIds.length > 0 ? 'auto' : 'preset';
    const teacher = pool.find((id) => getAgentRole?.(id) === 'teacher');
    return {
      selection: { mode, selectedAgentIds: teacher ? [teacher] : [] },
      isUserSet: false,
    };
  }

  if (persistedIsUserSet && persisted.selectedAgentIds.length > 0) {
    if (persisted.mode === 'auto') {
      const generated = new Set(generatedAgentIds);
      if (persisted.selectedAgentIds.every((id) => generated.has(id))) {
        return { selection: persisted, isUserSet: true };
      }
    } else if (persisted.selectedAgentIds.every(isPresetAgent)) {
      return { selection: persisted, isUserSet: true };
    }
  }

  if (generatedAgentIds.length > 0) {
    return { selection: { mode: 'auto', selectedAgentIds: generatedAgentIds }, isUserSet: false };
  }
  const cleanIds = stageAgentIds?.filter(isPresetAgent) ?? [];
  return {
    selection: {
      mode: 'preset',
      selectedAgentIds: cleanIds.length > 0 ? cleanIds : ['default-1', 'default-2', 'default-3'],
    },
    isUserSet: false,
  };
}
