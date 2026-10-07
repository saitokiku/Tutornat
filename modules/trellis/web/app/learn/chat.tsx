"use client";
import { useState } from "react";
import type { SkillRecord } from "@/lib/record";
import { RecordPanel } from "./record-panel";

type Msg = { who: "trellis" | "child"; text: string };
type TurnResponse = { reply: string; correct: boolean; nextItemIndex: number | null; record: SkillRecord; recorded: string; engine: string };

export function Chat({ opening, initialRecord }: { opening: string; initialRecord: SkillRecord }) {
  const [sessionId] = useState(() => `web-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`);
  const [msgs, setMsgs] = useState<Msg[]>([{ who: "trellis", text: opening }]);
  const [record, setRecord] = useState(initialRecord);
  const [itemIndex, setItemIndex] = useState<number | null>(0);
  const [attempt, setAttempt] = useState(1);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [engine, setEngine] = useState<string | null>(null);

  async function send(kind: "answer" | "mastered") {
    if (busy) return;
    const answer = text.trim();
    if (kind === "answer" && (!answer || itemIndex === null)) return;
    setBusy(true);
    setMsgs((m) => [...m, { who: "child", text: kind === "answer" ? answer : "Is it mastered yet?" }]);
    setText("");
    try {
      const res = await fetch("/api/turn", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify(kind === "answer" ? { kind, sessionId, itemIndex, attempt, answer } : { kind, sessionId }),
      });
      const j = (await res.json()) as TurnResponse & { error?: string };
      if (!res.ok) throw new Error(j.error ?? res.statusText);
      setMsgs((m) => [...m, { who: "trellis", text: j.reply }]);
      setRecord(j.record);
      setEngine(j.engine);
      if (kind === "answer") {
        if (j.correct) { setItemIndex(j.nextItemIndex); setAttempt(1); }
        else setAttempt((a) => a + 1);
        if (j.correct && j.nextItemIndex !== null) {
          const next = await fetch(`/api/turn?item=${j.nextItemIndex}`).then((r) => r.json() as Promise<{ prompt: string }>);
          setMsgs((m) => [...m, { who: "trellis", text: next.prompt }]);
        }
      }
    } catch (e) {
      setMsgs((m) => [...m, { who: "trellis", text: `Something went wrong on my side: ${(e as Error).message}` }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <section className="card">
        <div className="chat">
          {msgs.map((m, i) => (
            <div key={i} className={`bubble ${m.who}`}>
              <div className="who">{m.who === "trellis" ? "Trellis" : "Ada"}</div>
              {m.text}
            </div>
          ))}
        </div>
        <form className="ask" onSubmit={(e) => { e.preventDefault(); void send("answer"); }}>
          <input value={text} onChange={(e) => setText(e.target.value)} placeholder={itemIndex === null ? "Lesson done" : "Your answer, like 3/4"} disabled={busy || itemIndex === null} inputMode="text" autoComplete="off" />
          <button type="submit" disabled={busy || itemIndex === null}>Send</button>
        </form>
        <p className="note">
          <button type="button" className="btn quiet" onClick={() => void send("mastered")} disabled={busy}>Ask Trellis: is it mastered?</button>
          {engine ? <span style={{ marginLeft: 8 }}>tutor: {engine}</span> : null}
        </p>
      </section>
      <RecordPanel r={record} />
    </>
  );
}
