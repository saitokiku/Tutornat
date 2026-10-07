/**
 * Turn a learner's topic choice into the *existing* generation request.
 *
 * This file deliberately contains no transport. Course creation on the Kaizen
 * surface is the upstream flow verbatim: write `sessionStorage.generationSession`
 * and navigate to `/generation-preview`, exactly as `app/page.tsx` does. The
 * only thing added here is the teaching directive and the privacy strip.
 *
 * `buildGenerationSession`'s return type is a compile-time assertion that what
 * we write is still assignable to the preview page's own
 * `GenerationSessionState`; if upstream changes that shape, this stops
 * type-checking instead of silently producing a session it cannot read.
 *
 * ── The three boundaries the directive keeps separate ──
 *
 * Owner requirement: knowledge, instruction and learner state must not be
 * collapsed into one blob. In this request they are:
 *
 *   knowledge      — the subject matter itself (`topic`). What is true.
 *   instruction    — how to teach it (TEACHING_DIRECTIVE). Sequencing,
 *                    representation, worked examples, checks.
 *   learner state  — what we actually know about this person: a self-reported
 *                    age and a language. Nothing else. No inferred ability, no
 *                    mastery estimate, no nickname.
 *
 * They are emitted as separately labelled sections so the model cannot mistake
 * a pacing hint for a fact about the subject, or an instructional preference
 * for something the learner said.
 */
import type { UserRequirements } from '@/lib/types/generation';
import type { GenerationSessionState } from '@/app/generation-preview/types';
import type { KaizenLang, KaizenProfile } from './profile';

/** What a topic tile means. `icon` is a lucide name resolved at the component. */
export interface TopicSeed {
  readonly id: string;
  readonly icon: string;
  /** Short subject phrase per language, used in the prompt and as the tile label. */
  readonly label: Record<KaizenLang, string>;
}

/**
 * Starting points, not a course catalogue. These are *subjects to ask for*; a
 * tile here has never been generated and is never presented as a saved course.
 * The catalogue page only ever lists what `listStages()` actually returns.
 */
export const TOPIC_SEEDS: readonly TopicSeed[] = [
  { id: 'counting', icon: 'Calculator', label: { 'en-US': 'Numbers and counting', 'es-MX': 'Números y contar' } },
  { id: 'reading', icon: 'BookOpen', label: { 'en-US': 'Letters and reading', 'es-MX': 'Letras y lectura' } },
  { id: 'nature', icon: 'Leaf', label: { 'en-US': 'Plants and animals', 'es-MX': 'Plantas y animales' } },
  { id: 'body', icon: 'HeartPulse', label: { 'en-US': 'The human body', 'es-MX': 'El cuerpo humano' } },
  { id: 'space', icon: 'Rocket', label: { 'en-US': 'Space and planets', 'es-MX': 'El espacio y los planetas' } },
  { id: 'machines', icon: 'Hammer', label: { 'en-US': 'How machines work', 'es-MX': 'Cómo funcionan las máquinas' } },
  { id: 'money', icon: 'Coins', label: { 'en-US': 'Money and buying', 'es-MX': 'El dinero y las compras' } },
  { id: 'music', icon: 'Music', label: { 'en-US': 'Music and rhythm', 'es-MX': 'Música y ritmo' } },
  { id: 'water', icon: 'Droplets', label: { 'en-US': 'Water and weather', 'es-MX': 'El agua y el clima' } },
  { id: 'map', icon: 'Globe2', label: { 'en-US': 'Places on Earth', 'es-MX': 'Lugares de la Tierra' } },
  { id: 'cooking', icon: 'CookingPot', label: { 'en-US': 'Cooking and measuring', 'es-MX': 'Cocinar y medir' } },
  { id: 'safety', icon: 'ShieldCheck', label: { 'en-US': 'Staying safe', 'es-MX': 'Mantenerse a salvo' } },
];

export function seedById(id: string): TopicSeed | undefined {
  return TOPIC_SEEDS.find((s) => s.id === id);
}

const LANG_NAME: Record<KaizenLang, string> = { 'en-US': 'English', 'es-MX': 'Spanish (Mexico)' };

/**
 * The content-language policy for every downstream consumer, grounded in the
 * learner's actual chosen locale.
 *
 * Upstream stores this on the stage (`stage.languageDirective`) and it is the
 * *only* thing that reaches the classroom chat prompt
 * (`buildLanguageConstraint`, `lib/chat/pi/prompts.ts`). Without it, the
 * directive is whatever the outline model happened to infer, which is why an
 * English request could be answered in another language. Set from `profile.lang`
 * it is a fact about the learner's selection, not an inference.
 */
export function languageDirective(lang: KaizenLang): string {
  return `Teach, narrate and answer entirely in ${LANG_NAME[lang]} (BCP-47 \`${lang}\`). This is the learner's explicitly chosen interface language. Keep it for every scene, label, caption and chat reply, including follow-up questions, unless the learner asks in writing for another language.`;
}

/**
 * INSTRUCTION — how to teach, independent of the subject and of the learner.
 *
 * Ordered by what actually makes a lesson good, because the model weights
 * earlier instructions more heavily: correctness and a real explanatory
 * sequence first, representation second, polish never.
 *
 * Visual means *explanatory* here — a diagram that carries the idea. It is a
 * teaching instruction, not a theatrical one; "make it look impressive" is
 * explicitly ruled out below because that is what produces decorative slop.
 */
const TEACHING_DIRECTIVE = [
  'INSTRUCTION — how to teach this well:',
  '1. Correctness first. Teach the real concept, with the accepted terminology and accurate facts, figures and relationships. If something is contested or commonly misunderstood, say so plainly rather than simplifying it into something false.',
  '2. Build one explanatory sequence. Start from what the learner can already see or has already experienced, introduce one new idea at a time, and make each step depend on the previous one. Do not present a list of loosely related facts.',
  '3. Choose each scene for its teaching objective. Every scene must have a specific job — introduce, show the mechanism, work an example, compare two cases, or check understanding. State nothing you do not then use.',
  '4. Represent the idea in whatever form explains it best: a labelled diagram, a cross-section, a before/after pair, a sequence of steps, a comparison, a worked example, a number line, a map, a chart with real values, or a manipulable interactive. Pick the representation the concept calls for, not the one that looks most impressive.',
  '5. Work at least one concrete example all the way through, with real values, so the learner sees the idea actually applied rather than only described.',
  '6. Check understanding where it matters — after a step that is genuinely easy to get wrong — and make the check answerable by pointing at, choosing between or rearranging something concrete. Not after every sentence, and not as a quiz bolted on at the end.',
  '7. Address the common misconception for this topic explicitly, and show why it is wrong.',
  '8. On-screen text supports the visual: short labels, captions and the key terms the learner needs. Do not fill a scene with paragraphs, do not set prose as an image, and do not pad with generic dots, counters, mascots or decoration that teaches nothing.',
].join('\n');

/** LEARNER STATE — the only two things we actually know, both labelled as such. */
function learnerState(profile: KaizenProfile): string {
  const age =
    profile.age == null
      ? 'Age: not stated. Pitch for a general audience; avoid both baby talk and unexplained jargon.'
      : `Age: ${profile.age}, self-reported and unverified. Use it only to choose vocabulary, pacing and examples — never to assume reading ability, prior schooling or competence.`;
  return [
    'LEARNER STATE — all that is known about this person:',
    age,
    `Language: write all generated text — scene content, labels, captions and examples — in ${LANG_NAME[profile.lang]}.`,
    'Nothing else about this learner is known. Do not invent prior performance, a skill level, a grade, interests or a history, and do not refer to progress or mastery that has not been demonstrated in this lesson.',
  ].join('\n');
}

/**
 * The full requirement string: knowledge, then instruction, then learner state.
 */
export function buildRequirementText(topic: string, profile: KaizenProfile): string {
  return [
    `KNOWLEDGE — the subject to teach: ${topic}.`,
    '',
    TEACHING_DIRECTIVE,
    '',
    learnerState(profile),
  ].join('\n');
}

/**
 * The only outbound boundary for the local profile.
 *
 * `userNickname` exists on `UserRequirements` and upstream fills it. We leave
 * it unset: the nickname is device-local and must not reach a provider prompt
 * or an operational log. Returning a fresh object (never a spread of profile)
 * is what makes that structural rather than a promise.
 */
export function buildRequirements(topic: string, profile: KaizenProfile): UserRequirements {
  const trimmed = topic.trim();
  if (!trimmed) throw new Error('A learning topic is required');
  return {
    requirement: buildRequirementText(trimmed, profile),
    // Routes generation through upstream's interactive-first path, which is
    // what produces manipulable scenes rather than static slides.
    interactiveMode: true,
  };
}

/** The session the upstream preview page reads on mount. */
export function buildGenerationSession(
  topic: string,
  profile: KaizenProfile,
  sessionId: string,
): GenerationSessionState {
  return {
    sessionId,
    requirements: buildRequirements(topic, profile),
    // Carried through to `stage.languageDirective`, which is what the in-lesson
    // chat prompt reads. Generated content and the tutor therefore share one
    // language, taken from the learner's choice rather than inferred per call.
    languageDirective: languageDirective(profile.lang),
    pdfText: '',
    pdfImages: [],
    imageStorageIds: [],
    sceneOutlines: null,
    currentStep: 'generating',
  };
}
