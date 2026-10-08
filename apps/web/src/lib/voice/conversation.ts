import { REOPEN_IDLE_MS } from "./bands";
import type { Band } from "./types";

// The live loop as a pure state machine (live tutor spec §2.4, §5.1): what the learner sees and what
// the voice layer does next, from events in, effects out. No timers, no I/O: the driver (useTutorVoice)
// feeds it events and wakes it at wakeAt(); tests run it on a fake clock.
//
//   idle ─mic→ listening ─speech→ hearing ─turn→ thinking ─first audio→ speaking ─end→ idle | listening
//
// Tap mode (default for 3–9): a tap opens the mic, the turn ends by itself or on a second tap, the mic
// closes. Conversation mode (default for K–2 when allowed; opt-in for 3–9): after a reply that ends
// with "?" the mic reopens; it closes after 12 s with no learner speech (K–2 15 s); two empty
// reopenings in a row drop back to tap mode; a hard stop at 20 minutes; a hidden page, a route change
// or going offline stops it. Conversation mode needs consent, vendor listening and a natural voice.
//
// Honest waiting: the learner's bubble commits at the end of the turn; "Still working on it" at 3 s,
// "Taking longer than usual." with Try again at 10 s; no spoken filler. A turn the recognizer wasn't
// sure of (mean confidence < 0.6), or one that starts with "Mom" or a sibling's name, waits behind a
// question instead of being sent.

export type Phase = "idle" | "listening" | "hearing" | "thinking" | "speaking" | "confirm" | "error" | "micOff";
export type Mode = "tap" | "conversation";
export type Notice = "still" | "longer" | "slow" | "offline" | "lost" | "voiceOff" | null;
export type MicOff = "idle" | "hidden" | "limit";

/** Below this mean word confidence a turn is shown back ("Did you say …?") instead of sent. */
export const LOW_CONFIDENCE = 0.6;
/** Speech that resumes this soon after the end of turn, before any audio, merges with it (once). */
export const MERGE_MS = 1500;
export const STILL_MS = 3000;
export const LONGER_MS = 10_000;
/** Conversation mode stops after this long, whatever is happening. */
export const CONVERSATION_LIMIT_MS = 20 * 60_000;
/** Two empty reopenings in a row and conversation mode drops back to tap. */
export const EMPTY_REOPENS = 2;

export type ConvState = {
  phase: Phase;
  mode: Mode;
  band: Band;
  /** Conversation mode is allowed at all (consent, vendor listening, a natural voice). */
  conversationAllowed: boolean;
  /** The microphone is gated while the tutor speaks. */
  halfDuplex: boolean;
  /** The tutor is ducked under the learner (interrupted, not yet cancelled). */
  ducked: boolean;
  /** What the learner has said so far in this turn. */
  heard: string;
  /** A turn waiting for the learner: "Did you say …?" or "Send to the tutor?". */
  confirm: { text: string; kind: "unsure" | "addressee"; reading?: string } | null;
  error: { side: "in"; code: string } | null;
  micOff: MicOff | null;
  notice: Notice;
  /** The turn in flight. */
  turn: { text: string; endedAt: number; speculative: boolean; firstAudio: boolean; merged: boolean } | null;
  /** Words to merge with the next turn (a self-correction during thinking). */
  mergeFrom: string | null;
  /** The last text sent, for Try again. */
  lastSent: string | null;
  /** Conversation mode: when the mic reopened after a question, whether the learner spoke since, and empty reopenings in a row. */
  reopenedAt: number | null;
  spokeSinceReopen: boolean;
  emptyReopens: number;
  /** When conversation mode began (for the 20-minute stop). */
  conversationSince: number | null;
};

export type TurnIn = {
  text: string;
  /** Mean word confidence, null when the recognizer gives none. */
  confidence: number | null;
  /** The first word addresses someone else in the room (./addressee). */
  addressee?: boolean;
  /** For an answer, the parsed reading to show big ("7"). */
  reading?: string;
};

export type ConvEvent =
  | { type: "mic"; at: number }
  | { type: "stop-voice"; at: number }
  | { type: "mode"; mode: Mode; at: number }
  | { type: "speech-start"; at: number }
  | { type: "partial"; text: string; at: number }
  | ({ type: "eager"; at: number } & TurnIn)
  | { type: "resumed"; at: number }
  | ({ type: "turn"; at: number } & TurnIn)
  | { type: "confirm-send"; at: number }
  | { type: "confirm-again"; at: number }
  | { type: "first-audio"; at: number }
  | { type: "reply-end"; at: number; question: boolean; cancelled: boolean }
  | { type: "duck"; on: boolean; at: number }
  | { type: "barge"; at: number }
  | { type: "half-duplex"; at: number }
  | { type: "error-in"; code: string; at: number }
  | { type: "error-out"; at: number }
  | { type: "stream-error"; at: number }
  | { type: "retry"; at: number }
  | { type: "mic-off"; why: "idle" | "hidden"; at: number }
  | { type: "hidden"; at: number }
  | { type: "route"; at: number }
  | { type: "offline"; at: number }
  | { type: "slow"; on: boolean; at: number }
  | { type: "tick"; at: number };

export type Effect =
  | { type: "open-mic" }
  /** Stop listening; what was said becomes the turn. */
  | { type: "close-mic" }
  /** Stop listening and drop what was heard. */
  | { type: "abort-mic" }
  | { type: "send"; text: string; speculative: boolean }
  /** The speculative request stands as the real one. */
  | { type: "commit" }
  /** Drop the request in flight and the messages it added (TurnResumed, a self-correction). */
  | { type: "abort-request" }
  /** Stop the reply's stream but keep what was heard of it (a barge-in, Stop). */
  | { type: "stop-reply" }
  | { type: "stop-voice"; fadeMs: number }
  /** The machine changed the mode itself (empty reopenings, offline, a slow connection, the time limit). */
  | { type: "mode"; mode: Mode }
  | { type: "retry"; text: string };

export type ConvOptions = { band: Band; conversationAllowed: boolean; halfDuplex?: boolean; mode?: Mode };

/** Conversation mode is the default for K–2 when it is allowed; tap mode otherwise. */
export function convStart(o: ConvOptions): ConvState {
  const mode = o.mode === "conversation" && o.conversationAllowed ? "conversation" : o.mode === "tap" ? "tap" : o.band === "k2" && o.conversationAllowed ? "conversation" : "tap";
  return {
    phase: "idle",
    mode,
    band: o.band,
    conversationAllowed: o.conversationAllowed,
    halfDuplex: !!o.halfDuplex,
    ducked: false,
    heard: "",
    confirm: null,
    error: null,
    micOff: null,
    notice: null,
    turn: null,
    mergeFrom: null,
    lastSent: null,
    reopenedAt: null,
    spokeSinceReopen: false,
    emptyReopens: 0,
    conversationSince: null,
  };
}

type Out = { state: ConvState; effects: Effect[] };

const listen = (s: ConvState, at: number, effects: Effect[] = []): Out => ({
  state: { ...s, phase: "listening", heard: "", micOff: null, error: null, confirm: null, conversationSince: s.mode === "conversation" ? (s.conversationSince ?? at) : s.conversationSince },
  effects: [...effects, { type: "open-mic" }],
});

/** A finished turn: shown back when unsure or addressed to someone else, else sent. */
function takeTurn(s: ConvState, e: TurnIn & { at: number }): Out {
  const text = (s.mergeFrom ? `${s.mergeFrom} ${e.text}` : e.text).trim();
  const merged = !!s.mergeFrom;
  // Speaking in a reopened window breaks a run of empty reopenings; a turn after tapping the mic doesn't.
  const base = { ...s, heard: "", mergeFrom: null, spokeSinceReopen: s.reopenedAt != null ? true : s.spokeSinceReopen, emptyReopens: s.reopenedAt != null ? 0 : s.emptyReopens };
  if (!text) return s.mode === "conversation" ? { state: { ...base, phase: "listening" }, effects: [] } : { state: { ...base, phase: "idle" }, effects: [{ type: "close-mic" }] };
  const closeMic: Effect[] = s.mode === "tap" || s.halfDuplex ? [{ type: "close-mic" }] : [];
  if (e.addressee) return { state: { ...base, phase: "confirm", confirm: { text, kind: "addressee" } }, effects: closeMic };
  if (e.confidence != null && e.confidence < LOW_CONFIDENCE) return { state: { ...base, phase: "confirm", confirm: { text, kind: "unsure", reading: e.reading } }, effects: closeMic };
  // A speculative request (sent at the eager end of turn) already carries these words.
  if (s.turn?.speculative && s.turn.text === text)
    return { state: { ...base, phase: "thinking", turn: { ...s.turn, speculative: false, endedAt: e.at }, lastSent: text }, effects: [...closeMic, { type: "commit" }] };
  const replace: Effect[] = s.turn?.speculative ? [{ type: "abort-request" }] : [];
  return {
    state: { ...base, phase: "thinking", notice: null, turn: { text, endedAt: e.at, speculative: false, firstAudio: false, merged }, lastSent: text },
    effects: [...closeMic, ...replace, { type: "send", text, speculative: false }],
  };
}

/** Stops everything: the microphone, the voice. */
const stopAll = (s: ConvState, phase: Phase, micOff: MicOff | null, extra: Partial<ConvState> = {}): Out => ({
  state: { ...s, phase, micOff, ducked: false, heard: "", reopenedAt: null, ...extra },
  effects: [{ type: "abort-mic" }, { type: "stop-voice", fadeMs: 120 }, { type: "stop-reply" }],
});

export function convStep(s: ConvState, e: ConvEvent): Out {
  const none: Out = { state: s, effects: [] };
  switch (e.type) {
    // ---- anywhere
    case "hidden":
      return stopAll(s, "micOff", "hidden");
    case "route":
      return stopAll(s, "idle", null, { turn: null, confirm: null });
    case "offline": {
      const out = stopAll(s, "idle", null, { mode: "tap", notice: "offline" });
      return { state: out.state, effects: [...out.effects, ...(s.mode === "conversation" ? [{ type: "mode", mode: "tap" } as Effect] : [])] };
    }
    case "slow":
      if (!e.on) return { state: { ...s, notice: s.notice === "slow" ? null : s.notice }, effects: [] };
      return { state: { ...s, notice: "slow", mode: "tap" }, effects: s.mode === "conversation" ? [{ type: "mode", mode: "tap" }] : [] };
    case "half-duplex":
      return { state: { ...s, halfDuplex: true }, effects: [] };
    case "error-in":
      return { state: { ...s, phase: "error", error: { side: "in", code: e.code }, heard: "", reopenedAt: null }, effects: [] };
    case "error-out":
      // The words stay on screen; the voice is off for now.
      return { state: { ...s, notice: "voiceOff", ducked: false, phase: s.phase === "speaking" || s.phase === "thinking" ? "idle" : s.phase }, effects: [] };
    case "mic-off":
      if (s.phase !== "listening" && s.phase !== "hearing") return none;
      return { state: { ...s, phase: "micOff", micOff: e.why, heard: "", reopenedAt: null }, effects: [] };
    case "mode":
      if (e.mode === "conversation" && !s.conversationAllowed) return none;
      return { state: { ...s, mode: e.mode, emptyReopens: 0, conversationSince: e.mode === "conversation" ? null : s.conversationSince }, effects: [] };
    case "duck":
      return s.phase === "speaking" ? { state: { ...s, ducked: e.on }, effects: [] } : none;
    case "stream-error":
      return { state: { ...s, phase: "error", notice: "lost", turn: null }, effects: [] };
    case "retry":
      if (!s.lastSent) return none;
      return { state: { ...s, phase: "thinking", notice: null, error: null, turn: { text: s.lastSent, endedAt: e.at, speculative: false, firstAudio: false, merged: false } }, effects: [{ type: "retry", text: s.lastSent }] };
    case "tick":
      return tick(s, e.at);
  }

  switch (s.phase) {
    case "idle":
    case "micOff":
    case "error":
      if (e.type === "mic") return listen({ ...s, reopenedAt: null, notice: s.notice === "voiceOff" ? s.notice : null }, e.at);
      if (e.type === "turn") return takeTurn(s, e);
      return none;

    case "listening":
      if (e.type === "speech-start" || e.type === "partial") return { state: { ...s, phase: "hearing", heard: e.type === "partial" ? e.text : s.heard, spokeSinceReopen: true }, effects: [] };
      if (e.type === "mic") return { state: { ...s, phase: "idle", reopenedAt: null }, effects: [{ type: "abort-mic" }] };
      if (e.type === "turn") return takeTurn(s, e);
      return none;

    case "hearing":
      if (e.type === "partial") return { state: { ...s, heard: e.text }, effects: [] };
      if (e.type === "mic") return { state: s, effects: [{ type: "close-mic" }] }; // the second tap: done
      if (e.type === "eager") {
        if (s.band === "k2" || !e.text.trim() || e.addressee || (e.confidence != null && e.confidence < LOW_CONFIDENCE)) return none;
        const text = (s.mergeFrom ? `${s.mergeFrom} ${e.text}` : e.text).trim();
        return { state: { ...s, phase: "thinking", turn: { text, endedAt: e.at, speculative: true, firstAudio: false, merged: !!s.mergeFrom } }, effects: [{ type: "send", text, speculative: true }] };
      }
      if (e.type === "turn") return takeTurn(s, e);
      return none;

    case "thinking": {
      const t = s.turn;
      if (e.type === "resumed" && t?.speculative) return { state: { ...s, phase: "hearing", turn: null }, effects: [{ type: "abort-request" }] };
      if (e.type === "turn") return takeTurn(s, e);
      // A self-correction ("ten, no, twelve"): speech again right after the end of turn, before any audio.
      if ((e.type === "speech-start" || e.type === "partial") && t && !t.speculative && !t.firstAudio && !t.merged && e.at - t.endedAt <= MERGE_MS)
        return { state: { ...s, phase: "hearing", turn: null, mergeFrom: t.text, heard: e.type === "partial" ? e.text : "" }, effects: [{ type: "abort-request" }, ...(s.mode === "tap" || s.halfDuplex ? [{ type: "open-mic" } as Effect] : [])] };
      if (e.type === "first-audio") return { state: { ...s, phase: "speaking", notice: null, turn: t ? { ...t, firstAudio: true } : t }, effects: s.halfDuplex ? [{ type: "close-mic" }] : [] };
      if (e.type === "stop-voice") return { state: { ...s, phase: s.mode === "conversation" && !s.halfDuplex ? "listening" : "idle", turn: null }, effects: [{ type: "stop-voice", fadeMs: 120 }, { type: "stop-reply" }] };
      if (e.type === "reply-end") return replyEnd(s, e);
      return none;
    }

    case "speaking":
      if (e.type === "barge") return { state: { ...s, phase: "hearing", ducked: false, turn: null }, effects: [{ type: "stop-reply" }] };
      if (e.type === "stop-voice")
        return s.mode === "conversation" && !s.halfDuplex
          ? { state: { ...s, phase: "listening", ducked: false, turn: null }, effects: [{ type: "stop-voice", fadeMs: 120 }, { type: "stop-reply" }] }
          : { state: { ...s, phase: "idle", ducked: false, turn: null }, effects: [{ type: "stop-voice", fadeMs: 120 }, { type: "stop-reply" }] };
      if (e.type === "turn") return takeTurn({ ...s, ducked: false }, e);
      if (e.type === "reply-end") return replyEnd(s, e);
      return none;

    case "confirm":
      if (e.type === "confirm-send" && s.confirm) return takeTurn({ ...s, confirm: null }, { text: s.confirm.text, confidence: null, at: e.at });
      if (e.type === "confirm-again" || e.type === "mic") return listen({ ...s, confirm: null }, e.at);
      return none;
  }
}

function replyEnd(s: ConvState, e: { at: number; question: boolean; cancelled: boolean }): Out {
  const done = { ...s, ducked: false, turn: null };
  if (e.cancelled) return { state: { ...done, phase: s.phase === "hearing" ? "hearing" : s.mode === "conversation" ? "listening" : "idle" }, effects: [] };
  if (s.mode === "conversation" && e.question) {
    const out = listen(done, e.at);
    return { state: { ...out.state, reopenedAt: e.at, spokeSinceReopen: false }, effects: out.effects };
  }
  return { state: { ...done, phase: "idle" }, effects: s.mode === "tap" ? [] : [{ type: "close-mic" }] };
}

function tick(s: ConvState, at: number): Out {
  if (s.mode === "conversation" && s.conversationSince != null && at - s.conversationSince >= CONVERSATION_LIMIT_MS) {
    const out = stopAll(s, "micOff", "limit", { mode: "tap", conversationSince: null });
    return { state: out.state, effects: [...out.effects, { type: "mode", mode: "tap" }] };
  }
  if (s.phase === "listening" && s.mode === "conversation" && s.reopenedAt != null && !s.spokeSinceReopen && at - s.reopenedAt >= REOPEN_IDLE_MS[s.band]) {
    const empty = s.emptyReopens + 1;
    const back = empty >= EMPTY_REOPENS;
    return {
      state: { ...s, phase: "micOff", micOff: "idle", reopenedAt: null, emptyReopens: back ? 0 : empty, mode: back ? "tap" : s.mode, conversationSince: back ? null : s.conversationSince },
      effects: [{ type: "abort-mic" }, ...(back ? [{ type: "mode", mode: "tap" } as Effect] : [])],
    };
  }
  if (s.phase === "thinking" && s.turn && !s.turn.speculative) {
    const waited = at - s.turn.endedAt;
    const notice: Notice = waited >= LONGER_MS ? "longer" : waited >= STILL_MS ? "still" : s.notice;
    if (notice !== s.notice) return { state: { ...s, notice }, effects: [] };
  }
  return { state: s, effects: [] };
}

/** When the machine next needs a tick, or null. */
export function wakeAt(s: ConvState): number | null {
  const times: number[] = [];
  if (s.mode === "conversation" && s.conversationSince != null) times.push(s.conversationSince + CONVERSATION_LIMIT_MS);
  if (s.phase === "listening" && s.mode === "conversation" && s.reopenedAt != null && !s.spokeSinceReopen) times.push(s.reopenedAt + REOPEN_IDLE_MS[s.band]);
  if (s.phase === "thinking" && s.turn && !s.turn.speculative) {
    if (s.notice !== "still" && s.notice !== "longer") times.push(s.turn.endedAt + STILL_MS);
    if (s.notice !== "longer") times.push(s.turn.endedAt + LONGER_MS);
  }
  return times.length ? Math.min(...times) : null;
}

/** Truncates a tutor message to the words the learner heard, for the next request (spec §2.4 rule 7). */
export function heardPrefix(text: string, heardUpTo: number): string {
  const words = text.split(/\s+/).filter(Boolean);
  if (heardUpTo >= words.length - 1) return text;
  return `${words.slice(0, Math.max(0, heardUpTo + 1)).join(" ")} [interrupted]`.trim();
}
