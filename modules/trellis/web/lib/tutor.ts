// Trellis, the tutor persona inside KaizenEdu. Scripted by default; OpenAI when
// OPENAI_API_KEY is present (plain fetch, no SDK, no Gemini routes — ADR-0049).
// Trellis never grades for the record: the seam records practice and exposure; this
// file only produces words. Nothing here can mint qualifying evidence (E1).
import { LESSON, parseFraction, reduce, sameValue, show, type LessonItem } from "./lesson";

export type TurnInput = { itemIndex: number; answer: string };
export type TurnResult = {
  correct: boolean;
  helped: boolean; // true when Trellis gave instruction on the skill (assisted-help exposure)
  reply: string;
  nextItemIndex: number | null;
  engine: "scripted" | "openai";
};

export function item(i: number): LessonItem {
  const it = LESSON[i];
  if (!it) throw new Error(`no lesson item ${i}`);
  return it;
}

export function grade(it: LessonItem, answer: string): boolean {
  const f = parseFraction(answer);
  return f !== null && sameValue(reduce(f), it.answer);
}

export function scriptedTurn({ itemIndex, answer }: TurnInput): TurnResult {
  const it = item(itemIndex);
  const correct = grade(it, answer);
  const last = itemIndex >= LESSON.length - 1;
  if (correct) {
    return {
      correct, helped: false, engine: "scripted",
      reply: `${show(it.answer)} — yes. ${last ? "That was the last one for tonight. Nice work." : "Ready for the next one?"}`,
      nextItemIndex: last ? null : itemIndex + 1,
    };
  }
  return {
    correct, helped: true, engine: "scripted",
    reply: `Not quite. ${it.hint} Try it again.`,
    nextItemIndex: itemIndex,
  };
}

// Optional model path. The scripted grader still decides correct/helped so the record
// never depends on the model's opinion; the model only phrases Trellis' reply.
export async function modelReply(it: LessonItem, answer: string, correct: boolean): Promise<string | null> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;
  const model = process.env.OPENAI_MODEL ?? "gpt-4o-mini";
  const system = `You are Trellis, a warm, plain-spoken tutor inside KaizenEdu for a 9-year-old. Two sentences max. Never say mastered, certified, or proven. ${correct ? "Confirm the answer briefly." : `Give one hint toward: ${it.hint} Do not state the final answer.`}`;
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
    body: JSON.stringify({ model, temperature: 0.4, max_tokens: 120, messages: [
      { role: "system", content: system },
      { role: "user", content: `Problem: ${it.prompt}\nChild's answer: ${answer}` },
    ] }),
  });
  if (!res.ok) return null;
  const j = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  return j.choices?.[0]?.message?.content?.trim() ?? null;
}

export async function tutorTurn(input: TurnInput): Promise<TurnResult> {
  const scripted = scriptedTurn(input);
  const phrased = await modelReply(item(input.itemIndex), input.answer, scripted.correct).catch(() => null);
  return phrased ? { ...scripted, reply: phrased, engine: "openai" } : scripted;
}

export const OPENING = `Hi Ada, I'm Trellis. Tonight: adding fractions when the bottoms don't match. Here's the first one — ${LESSON[0]?.prompt} Type your answer like 3/4.`;
