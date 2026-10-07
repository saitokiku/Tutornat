// The only write path in web/: practice turns go through lib/practice.ts to the seam
// (append_practice / record_exposure) as the tutor role. Nothing here writes evidence
// directly and nothing here can mint qualifying evidence.
import { NextResponse } from "next/server";
import { LESSON } from "@/lib/lesson";
import { practiceTurn } from "@/lib/practice";
import { honestAnswer, readRecord } from "@/lib/record";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const i = Number(new URL(req.url).searchParams.get("item") ?? "0");
  const it = LESSON[i];
  if (!it) return NextResponse.json({ error: "no such item" }, { status: 404 });
  return NextResponse.json({ prompt: `Next: ${it.prompt}`, index: i });
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as
    | { kind: "answer"; sessionId: string; itemIndex: number; attempt: number; answer: string }
    | { kind: "mastered"; sessionId: string }
    | null;
  if (!body || typeof body.sessionId !== "string" || body.sessionId.length > 64) {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }
  try {
    if (body.kind === "mastered") {
      const record = await readRecord();
      return NextResponse.json({ reply: honestAnswer(record), correct: false, nextItemIndex: null, record, recorded: "none", engine: "record" });
    }
    if (body.kind !== "answer" || !Number.isInteger(body.itemIndex) || !Number.isInteger(body.attempt) || typeof body.answer !== "string" || body.answer.length > 40) {
      return NextResponse.json({ error: "bad request" }, { status: 400 });
    }
    const out = await practiceTurn(body.sessionId, body.attempt, { itemIndex: body.itemIndex, answer: body.answer });
    const record = await readRecord();
    return NextResponse.json({ reply: out.reply, correct: out.correct, nextItemIndex: out.nextItemIndex, record, recorded: out.recorded, engine: out.engine });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
