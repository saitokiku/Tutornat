/**
 * Tutor tool inventory — what the tutor can actually reach, and what it cannot.
 *
 * Purpose: tool selection must follow the TEACHING OBJECTIVE, not the modality
 * that looks most impressive. This table makes the available/deferred boundary
 * explicit and machine-checkable so neither the UI nor a future prompt can
 * advertise a capability that does not exist.
 *
 * Every `available: true` entry below names a real upstream surface, verified
 * present in this checkout at SHA 5312c2b4b4bcb2e7db07cacabcdac8bfddc827fa:
 *   - stage writer tools: `lib/agent-runtime/stage-writer-tools.ts`
 *     (`STAGE_WRITER_TOOL_NAMES`)
 *   - scene content kinds the renderer can actually draw:
 *     `components/stage/scene-renderer.tsx` (slide | quiz | interactive | pbl)
 *   - study-guide text: `lib/chat/lecture-notes.ts` (`buildLectureNotes`)
 *   - contextual conversation: `/api/chat` + `/api/chat/pi`
 *     (`components/chat/use-chat-sessions.ts`)
 *
 * `available: false` is a promise NOT kept yet. Nothing in the UI may offer a
 * deferred tool as if it worked; `kaizen-ui-tutor-tools.test.ts` asserts the
 * evidence path of every available entry really exists on disk.
 */

/** Why the tutor would pick a tool — the objective, not the medium. */
export type TeachingObjective =
  | 'explain' // make a mechanism or relationship visible
  | 'practice' // let the learner try it
  | 'check' // find out whether it landed
  | 'recall' // help it stick over time
  | 'converse'; // answer what the learner actually just asked

export interface TutorTool {
  readonly id: string;
  /** The objective this serves. Selection is by objective first. */
  readonly objective: TeachingObjective;
  /** True only when a real upstream surface backs it today. */
  readonly available: boolean;
  /** Repo-relative file or route proving the claim. */
  readonly evidence: string;
  /** Short note: what it is for, or why it is deferred. */
  readonly note: string;
}

export const TUTOR_TOOLS: readonly TutorTool[] = [
  // ── available now ────────────────────────────────────────────────────────
  {
    id: 'stage-slide',
    objective: 'explain',
    available: true,
    evidence: 'components/stage/scene-renderer.tsx',
    note: 'Labelled diagram / cross-section / before-after / worked example as a rendered slide scene.',
  },
  {
    id: 'stage-interactive',
    objective: 'practice',
    available: true,
    evidence: 'components/scene-renderers/interactive-renderer.tsx',
    note: 'Manipulable scene — point, choose, rearrange. Sandboxed iframe host, no same-origin execution.',
  },
  {
    id: 'stage-quiz',
    objective: 'check',
    available: true,
    evidence: 'components/scene-renderers/quiz-renderer.tsx',
    note: 'Understanding check placed where an error is likely. Answers are not mastery evidence.',
  },
  {
    id: 'stage-pbl',
    objective: 'practice',
    available: true,
    evidence: 'components/scene-renderers/pbl-renderer.tsx',
    note: 'Longer problem/task scene for applying the idea.',
  },
  {
    id: 'contextual-chat',
    objective: 'converse',
    available: true,
    evidence: 'app/api/chat/pi/route.ts',
    note: 'The tutor answers the learner\'s actual latest question beside the stage. Current priority after lesson quality.',
  },
  {
    id: 'study-guide',
    objective: 'recall',
    available: true,
    evidence: 'lib/chat/lecture-notes.ts',
    note: 'Lecture notes derived from the real generated scenes — a study guide, not a new generation.',
  },
  {
    id: 'generate-scene',
    objective: 'explain',
    available: true,
    evidence: 'lib/agent-runtime/stage-writer-tools.ts',
    note: 'Writer tool `generate_scene` — add a scene to the shared versioned lesson state.',
  },

  // ── deferred: real surface exists but is NOT wired into this flow ────────
  {
    id: 'flashcards',
    objective: 'recall',
    available: false,
    evidence: '',
    note: 'DEFERRED. No upstream flashcard artifact exists; would need a real generator plus spaced review. Do not offer it.',
  },
  {
    id: 'worksheet',
    objective: 'practice',
    available: false,
    evidence: '',
    note: 'DEFERRED. Printable/offline practice artifact. Not built; a quiz scene is not a worksheet.',
  },
  {
    id: 'podcast',
    objective: 'explain',
    available: false,
    evidence: 'app/api/generate/tts',
    note: 'DEFERRED BY OWNER until lesson quality and conversation are proven. A TTS route exists upstream but is intentionally NOT used by the Kaizen surface — no automatic speech, no mic.',
  },
  {
    id: 'narration',
    objective: 'explain',
    available: false,
    evidence: 'app/api/generate/tts',
    note: 'DEFERRED. Spoken delivery is not a current requirement; text/captions are the accessibility fallback. Long-term low-literacy goal is unchanged.',
  },
];

export function toolsFor(objective: TeachingObjective): readonly TutorTool[] {
  return TUTOR_TOOLS.filter((tool) => tool.objective === objective && tool.available);
}

export function availableTools(): readonly TutorTool[] {
  return TUTOR_TOOLS.filter((tool) => tool.available);
}

export function deferredTools(): readonly TutorTool[] {
  return TUTOR_TOOLS.filter((tool) => !tool.available);
}
