/**
 * Pre-filter for learner text (spec §5.6, R10, safety-26). Pure functions.
 *
 * Two outcomes short-circuit the model: a crisis disclosure gets the referral
 * text and ends tutoring; a disallowed request gets a one-sentence redirect.
 * Everything else reaches the model, whose system prompt carries the fuller
 * policy. The 9–12 band uses stricter lists. Patterns are deliberately
 * specific so ordinary math talk ("this problem is killing me") passes.
 */
import type { AgeBand } from '@/kaizen.config';

export type CrisisCategory = 'self_harm' | 'abuse';
export type RedirectCategory =
  | 'sexual'
  | 'romance'
  | 'violence'
  | 'substances'
  | 'personal_info'
  | 'jailbreak'
  | 'profanity';

export type SafetyVerdict =
  | { kind: 'ok' }
  | { kind: 'crisis'; category: CrisisCategory }
  | { kind: 'redirect'; category: RedirectCategory };

const SELF_HARM = [
  /\b(kill|killing|hurt|hurting|cut|cutting|harm|harming)\s+myself\b/i,
  /\b(end|ending|take|taking)\s+my\s+(own\s+)?life\b/i,
  /\bsuicid(e|al)\b/i,
  /\b(want|wanted|wanna|going)\s+to\s+(die|disappear\s+forever|not\s+exist)\b/i,
  /\bdon'?t\s+want\s+to\s+(be\s+alive|live\s+anymore|wake\s+up)\b/i,
  /\bself[-\s]?harm\b/i,
  /\boverdos(e|ing)\b/i,
  /\bbetter\s+off\s+(dead|without\s+me)\b/i,
];

const ABUSE = [
  /\b(hits|hit|beats|beat|punches|punched|chokes|choked|kicks|kicked|touches|touched)\s+me\b/i,
  /\b(hurts|hurt)\s+me\s+(at\s+home|when|every|a\s+lot|badly|really)\b/i,
  /\b(abus(es|ed|ing)\s+me|being\s+abused|sexually\s+abused|molest(ed|s|ing)|raped?\b)/i,
  /\b(scared|afraid)\s+(to\s+go|of\s+going)\s+home\b/i,
  /\bnot\s+safe\s+at\s+home\b/i,
];

const SEXUAL = [
  /\b(sex|sexy|porn\w*|nudes?|naked|horny|boobs|penis|vagina|blowjob|hook\s?up\s+with\s+me)\b/i,
];

const ROMANCE = [
  /\bbe\s+my\s+(girlfriend|boyfriend|gf|bf)\b/i,
  /\b(are\s+you\s+single|date\s+me|marry\s+me|kiss\s+me|do\s+you\s+love\s+me|i\s+love\s+you)\b/i,
  /\b(flirt|flirting)\s+with\s+me\b/i,
  /\bromantic\s+roleplay\b/i,
];

const VIOLENCE = [
  /\bhow\s+(do|can|to|would)\s+(i|you|we)?\s*(make|build|get)\s+a\s+(bomb|gun|weapon|explosive)\b/i,
  /\b(kill|murder|shoot|stab)\s+(him|her|them|someone|everyone|my\s+\w+)\b/i,
  /\bshoot\s+up\s+(the|my)\s+school\b/i,
  /\bhow\s+to\s+(hurt|beat\s+up|poison)\s+(someone|a\s+person|my\s+\w+)\b/i,
];

const SUBSTANCES_ALL = [
  /\bhow\s+(do|can|to)\s+(i\s+)?(get|buy|make|smoke|use)\s+(weed|drugs|cocaine|meth|alcohol|beer|vapes?|a\s+vape)\b/i,
  /\bget\s+(high|drunk|wasted)\b/i,
];

const SUBSTANCES_YOUNG = [
  ...SUBSTANCES_ALL,
  /\b(weed|vape|vaping|vapes|drunk|beer|cocaine|meth|marijuana)\b/i,
];

const PERSONAL_INFO = [
  /\bwhat('?s|\s+is)\s+your\s+(phone|number|address|snap\w*|insta\w*|discord|tiktok|email)\b/i,
  /\bmy\s+(home\s+)?(address|phone\s+number)\s+is\b/i,
  /\b(text|call|message|dm)\s+me\b/i,
  /\b(can|could)\s+we\s+(meet|hang\s+out)\b/i,
];

const JAILBREAK = [
  /\bignore\s+(all\s+|your\s+|the\s+)?(previous\s+|prior\s+|above\s+)?(instructions|rules|guidelines)\b/i,
  /\bpretend\s+(you\s+are|you're|to\s+be)\s+(a|an|my)?\s*(different|unrestricted|uncensored|evil|human)\b/i,
  /\byou\s+are\s+now\s+(dan|unrestricted|free|uncensored)\b/i,
  /\b(developer|dev|god)\s+mode\b/i,
  /\bjailbreak\b/i,
  /\b(reveal|show|print)\s+(your|the)\s+system\s+prompt\b/i,
  /\bwithout\s+(any\s+)?(rules|restrictions|filters|limits)\b/i,
  /\bmy\s+(teacher|parent|mom|dad)\s+said\s+you\s+(can|should|have\s+to)\b/i,
];

const PROFANITY = [/\b(fuck\w*|shit\w*|bitch\w*|asshole|cunt|dick(head)?)\b/i];

function matches(text: string, patterns: readonly RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(text));
}

function normalize(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

/** Crisis detection alone (every band). */
export function detectCrisis(text: string): CrisisCategory | null {
  const t = normalize(text);
  if (!t) return null;
  if (matches(t, SELF_HARM)) return 'self_harm';
  if (matches(t, ABUSE)) return 'abuse';
  return null;
}

/** Disallowed-content detection; stricter lists for 9–12 and 4–8. */
export function detectDisallowed(text: string, band: AgeBand): RedirectCategory | null {
  const t = normalize(text);
  if (!t) return null;
  const young = band === '9-12' || band === '4-8';
  if (matches(t, JAILBREAK)) return 'jailbreak';
  if (matches(t, VIOLENCE)) return 'violence';
  if (matches(t, SEXUAL)) return 'sexual';
  if (matches(t, ROMANCE)) return 'romance';
  if (matches(t, young ? SUBSTANCES_YOUNG : SUBSTANCES_ALL)) return 'substances';
  if (matches(t, PERSONAL_INFO)) return 'personal_info';
  if (young && matches(t, PROFANITY)) return 'profanity';
  return null;
}

export function screenLearnerText(text: string, band: AgeBand): SafetyVerdict {
  const crisis = detectCrisis(text);
  if (crisis) return { kind: 'crisis', category: crisis };
  const disallowed = detectDisallowed(text, band);
  if (disallowed) return { kind: 'redirect', category: disallowed };
  return { kind: 'ok' };
}

/** Spoken redirect, one sentence, then back to the task (spec §5.6). */
export function redirectText(category: RedirectCategory, band: AgeBand): string {
  const young = band === '9-12' || band === '4-8';
  switch (category) {
    case 'personal_info':
      return young
        ? "I don't need any contact details, and I can't share any. Let's get back to the math. Where were we?"
        : "I can't take or share contact details here. Let's get back to the problem. Where were we?";
    case 'jailbreak':
      return 'My rules stay the same no matter what. Back to the problem: what is the next step?';
    case 'sexual':
    case 'romance':
    case 'violence':
    case 'substances':
    case 'profanity':
      return young
        ? "That is not something we talk about here. Let's get back to the math. What were we working on?"
        : "I can't help with that here. Let's get back to the problem. What were we working on?";
  }
}

/** Off-topic phrases the prompt handles; exported so evals can label cases. */
export function looksOffTopic(text: string): boolean {
  return /\b(play\s+a\s+game|tell\s+me\s+a\s+joke|what'?s\s+your\s+favou?rite|do\s+you\s+like|who\s+would\s+win|write\s+(me\s+)?a\s+(story|poem|rap))\b/i.test(
    text,
  );
}
