import type { Locale } from "../types";

// Runs on every learner message before any model sees it, in both the AI and the demo tutor.
// A crisis or abuse disclosure gets a fixed, kind referral written by people, never by a model,
// and a note for the family's grown-ups. Off-limits topics get one line and a way back to learning.
// ponytail: pattern matching only; it misses things a classifier would catch. Never call it monitoring.

export type Screen = { kind: "ok" } | { kind: "crisis" | "abuse" | "offLimits"; reply: string };

const CRISIS =
  /\b(kill(ing)? my ?self|suicid|want(ed)? to die|wanna die|end (my|it all)|hurt(ing)? my ?self|cut(ting)? my ?self|don'?t want to (be alive|live)|matarme|suicid|me quiero morir|quiero morir(me)?|no quiero vivir|hacerme da[ñn]o|cortarme)/i;
const ABUSE =
  /\b(someone|somebody|my (dad|mom|father|mother|uncle|brother|stepdad|stepmom|coach|teacher)|he|she|they) (hits?|hurts?|touches?|beats?) me\b|\b(being|been|get|getting) (abused|hit|beaten)\b|\bme (pega|golpea|toca|lastima)\b|\babus(o|an) de m[ií]\b/i;
const OFF_LIMITS =
  /\b(porn\w*|sex(y|ual)?|nude|naked|erotic\w*|brothels?|prostitut\w*|drugs?|weed|cannabis|marijuana|cocaine|heroin|meth(amphetamine)?|fentanyl|lsd|vape|vaping|alcohol|beer|vodka|gun|kill (him|her|them|someone)|bomb|weapon|droga|marihuana|coca[ií]na|hero[ií]na|burdel|prostitu\w*|desnud|sexo|arma|pistola|bomba)\b/i;
/** School science that uses a word on the off-limits list (grade 7 life science: how living things reproduce). */
const SCHOOL_TERMS = /\b(sexual(?: (?:and|or|vs\.?|versus) asexual)? reproduction|reproducci[oó]n (?:a?sexual)(?: (?:y|o) (?:a?sexual))?)\b/gi;

const TEXT = {
  en: {
    crisis:
      "I'm a computer, so I can't help with this the way a person can, and you deserve real help. If you might hurt yourself, please tell a grown-up you trust right now. You can also call or text 988 any time to talk to a real person (Suicide & Crisis Lifeline). If you are in danger, call 911. I've left a note for the grown-ups in your family.",
    abuse:
      "Thank you for telling me. You did nothing wrong. Please tell a grown-up you trust — a parent, a teacher, or a school counselor. You can call or text the Childhelp hotline at 1-800-422-4453 any time to talk to a real person. If you are in danger right now, call 911.",
    offLimits: "That's not something I can help with. Want to get back to what you're learning?",
  },
  es: {
    crisis:
      "Soy una computadora, así que no puedo ayudarte con esto como lo haría una persona, y mereces ayuda de verdad. Si podrías hacerte daño, por favor dile ahora mismo a un adulto de confianza. También puedes llamar o enviar un mensaje al 988 a cualquier hora para hablar con una persona (Línea de Prevención del Suicidio y Crisis, en español). Si estás en peligro, llama al 911. Dejé una nota para los adultos de tu familia.",
    abuse:
      "Gracias por contármelo. No hiciste nada malo. Por favor dile a un adulto de confianza: tu mamá, tu papá, un maestro o el consejero de la escuela. Puedes llamar o enviar un mensaje a Childhelp al 1-800-422-4453 a cualquier hora para hablar con una persona. Si estás en peligro ahora, llama al 911.",
    offLimits: "Con eso no puedo ayudar. ¿Volvemos a lo que estás aprendiendo?",
  },
} as const;

export function screen(text: string, locale: Locale): Screen {
  const t = TEXT[locale];
  if (CRISIS.test(text)) return { kind: "crisis", reply: t.crisis };
  if (ABUSE.test(text)) return { kind: "abuse", reply: t.abuse };
  if (OFF_LIMITS.test(text.replace(SCHOOL_TERMS, " "))) return { kind: "offLimits", reply: t.offLimits };
  return { kind: "ok" };
}

/**
 * True when text a source sent back (a Wikipedia extract, a dictionary sense, a book title) passes the
 * same screen as the learner's own words. Children see and hear these cards, so a source answer that
 * would have been screened out as a question is not shown either.
 */
export const suitable = (text: string) => screen(text, "en").kind === "ok";

/** California SB 243: remind a known minor to take a break every three hours in a sitting. */
export const BREAK_EVERY_MS = 3 * 3600_000;

/** Plain text fields only; binary attachments remain untrusted data and never grant permissions. */
export function safeTextFields(value: unknown, locale: Locale = "en"): boolean {
  if (typeof value === "string") return value.startsWith("data:") || screen(value, locale).kind === "ok";
  if (Array.isArray(value)) return value.every((v) => safeTextFields(v, locale));
  if (value && typeof value === "object") return Object.values(value).every((v) => safeTextFields(v, locale));
  return true;
}
