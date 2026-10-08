import type { Locale } from "@/lib/types";
import { makeItem } from "@/practice/skills";
import type { Item, MathPart } from "@/practice/types";

// A problem "like" the learner's, to work out in full — never the learner's own problem again. Small
// skills (count to 10, a bank of ten questions) repeat often from a fresh seed, and a worked example of
// the same problem would give the answer away before they tried. Pure; the demo tutor and the AI tutor's
// similar_problem tool both draw through here.

const answerOf = (i: Item) => (i.answer.kind === "choice" ? (i.choices?.[i.answer.index]?.label ?? "") : JSON.stringify(i.answer));

/** True when two items ask the same question with the same answer. */
export function sameProblem(a: Item, b: Item): boolean {
  return (
    a.say === b.say &&
    JSON.stringify(a.prompt) === JSON.stringify(b.prompt) &&
    JSON.stringify(a.passage ?? null) === JSON.stringify(b.passage ?? null) &&
    JSON.stringify(a.visual ?? null) === JSON.stringify(b.visual ?? null) &&
    a.picture === b.picture &&
    answerOf(a) === answerOf(b)
  );
}

const promptText = (parts: MathPart[]) => parts.map((p) => (typeof p === "string" ? p : "frac" in p ? ` ${p.frac[0]}/${p.frac[1]} ` : "sup" in p ? ` ${p.sup[0]}^${p.sup[1]} ` : " ")).join("");

const numbersIn = (text: string): string[] => [...(text.match(/\d+(?:\.\d+)?/g) ?? [])];

/**
 * True when every number in `item`'s problem is among the numbers the learner typed, in any order
 * ("3 + 4" for a typed "4 + 3"), so its worked steps could solve theirs. Erring toward true only costs
 * a re-draw.
 */
export function sameNumbers(item: Item, typed: string): boolean {
  const left = numbersIn(typed);
  const theirs = numbersIn(promptText(item.prompt));
  if (!theirs.length || !left.length) return false;
  for (const n of theirs) {
    const at = left.indexOf(n);
    if (at < 0) return false;
    left.splice(at, 1);
  }
  return true;
}

/**
 * A fresh problem of the skill that is not the learner's own: not the item on screen (`avoid.item`), and
 * not one with exactly the numbers of anything they typed in the conversation (`avoid.typed`, each
 * message on its own). Draws up to 20 seeds from the first; null when the skill has nothing else at
 * that level.
 */
export function similarItem(skillId: string, level: number, locale: Locale, seed: number, avoid?: { item?: Item | null; typed?: readonly string[] }): Item | null {
  for (let i = 0; i < 20; i++) {
    const item = makeItem(skillId, level, (seed + i * 7919) >>> 0, locale);
    if (avoid?.item && sameProblem(item, avoid.item)) continue;
    if (avoid?.typed?.some((text) => sameNumbers(item, text))) continue;
    return item;
  }
  return null;
}
