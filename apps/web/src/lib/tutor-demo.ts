import { t } from "@/i18n";
import type { Locale } from "./types";
import { makeItem } from "@/practice/skills";
import { randomSeed } from "@/practice/rng";
import type { Item } from "@/practice/types";

// The demo tutor: what the tutor can do with no AI connected. It only uses vetted material — the
// problem's own hint ladder, its worked steps, and a fresh problem of the same skill worked out.
// It says plainly that it is the demo.

export type DemoTurn = { text: string; similar?: Item };

export type DemoState = { hintsGiven: number; tries: number };

export type Intent = "hint" | "similar" | "answer" | "why" | "other";

export function intentOf(text: string): Intent {
  const s = text.toLowerCase();
  if (/hint|pista|help|ayuda|stuck|no s[eé]|don.t know/.test(s)) return "hint";
  if (/similar|example|another|parecido|ejemplo|otro/.test(s)) return "similar";
  if (/answer|tell me|just|respuesta|dime/.test(s)) return "answer";
  if (/why|how come|por qu[eé]|explain|explica/.test(s)) return "why";
  return "other";
}

export function demoOpening(item: Item, locale: Locale): DemoTurn {
  return { text: `${t(locale, "tutor.demo.open")} ${item.hints[0]}` };
}

export function demoReply(item: Item, locale: Locale, intent: Intent, state: DemoState): DemoTurn {
  switch (intent) {
    case "hint": {
      const next = item.hints[Math.min(state.hintsGiven, item.hints.length - 1)];
      return { text: state.hintsGiven >= item.hints.length ? t(locale, "tutor.demo.noMoreHints") : next };
    }
    case "similar": {
      const similar = makeItem(item.skillId, item.level, randomSeed(), locale);
      return { text: t(locale, "tutor.demo.similar"), similar };
    }
    case "answer":
      return { text: state.tries < 1 ? t(locale, "tutor.demo.tryFirst") : t(locale, "tutor.demo.showHow") };
    case "why":
      return { text: item.steps[0] };
    default:
      return { text: t(locale, "tutor.demo.other") };
  }
}
