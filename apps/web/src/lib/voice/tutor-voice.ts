"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { addressesSomeoneElse } from "./addressee";
import { sentenceFeed } from "./chunk";
import { convStart, convStep, wakeAt, type ConvEvent, type ConvState, type Effect, type Mode } from "./conversation";
import { converse, type Converse } from "./converse";
import { logVoice, metricOf, postMetric, type TurnMarks } from "./metrics";
import { useAppVoice } from "./root";

// The talking tutor's loop for a screen (Talk, the drawer beside a problem): the app voice, the
// two-way listener (./converse) and the state machine (./conversation), with the screen's chat
// behind three callbacks. The screen renders `state` (the VoiceBar of spec §5.1) and streams each
// reply into `reply()`; everything else — the microphone, barge-in, echo, conversation mode, honest
// waiting, the latency log — happens here.

export type SendInfo = {
  via: "voice";
  /** The turn's mean word confidence, null when the recognizer gives none. */
  confidence: number | null;
  /** Sent at the eager end of turn: onAbortRequest may take it back, onCommit keeps it. */
  speculative: boolean;
  /** "Try again" after a lost connection: the same turn again. */
  retry: boolean;
  /**
   * The reply's voice, opened now (at the end of turn) so its socket is ready before the first
   * token: write() each text delta into it, partDone() at each finished text part, end() at the end.
   */
  reply: ReplyFeed;
};

export type TutorVoiceOptions = {
  /** Send the learner's turn (context.input = "voice"). */
  onSend(text: string, info: SendInfo): void;
  /** The speculative request stands as the real one. */
  onCommit?(): void;
  /** Drop the request in flight and the messages it added (useChat stop, then remove them). */
  onAbortRequest?(): void;
  /** Stop the reply's stream but keep what was heard: send heardPrefix(text, heardUpTo) next time. */
  onStopReply?(heardUpTo: number): void;
  /** A practice item waits: reads the words as an answer (practice/spoken.ts readSpoken), for the early end and "Did you say 7?". */
  answer?: (text: string) => { reading: string; certainty: "sure" | "unsure" } | null;
  /** Lesson vocabulary for the recognizer (never names). */
  keyterms?: string[];
  /** Tap or conversation; the band's default when left out. */
  mode?: Mode;
};

export type ReplyFeed = ReturnType<typeof sentenceFeed>;

export type TutorVoice = {
  state: ConvState;
  /** The mic button: open, or (while it's open) end the turn now. */
  mic(): void;
  /** The square Stop button and Escape: stops the voice only. */
  stopVoice(): void;
  setMode(mode: Mode): void;
  confirmSend(): void;
  confirmAgain(): void;
  /** "Try again" after "Lost the connection". */
  retry(): void;
  /** Speak a reply that didn't come from a spoken turn (a typed turn read aloud): a fresh feed. A spoken turn's feed comes with onSend. */
  reply(): ReplyFeed;
  /** The reply's first text arrived (latency log). */
  markFirstToken(): void;
  /** The learner's bubble is on screen (latency log: acknowledgement within 150 ms). */
  markAck(): void;
  /** Heard while the tutor spoke but set aside as its echo: offer "Did you say …?". */
  setAside: string | null;
  sendSetAside(): void;
  /** Mic level 0..1 for the listening ring, null when it can't be measured. */
  level(): number | null;
  /** The last word of the tutor's reply the learner heard. */
  heardUpTo(): number;
};

const now = () => (typeof performance !== "undefined" ? performance.now() : Date.now());

export function useTutorVoice(opts: TutorVoiceOptions): TutorVoice {
  const app = useAppVoice();
  const handlers = useRef(opts);
  useEffect(() => {
    handlers.current = opts;
  });
  const start = () => convStart({ band: app.band, conversationAllowed: app.conversation, halfDuplex: !!app.in && !app.in.duplex, mode: opts.mode });
  const [state, setState] = useState<ConvState>(start);
  const sRef = useRef<ConvState>(state);
  const marks = useRef<TurnMarks>({});
  const posted = useRef(false);
  const confidence = useRef<number | null>(null);
  const replyRun = useRef<number | null>(null);
  const question = useRef(false);
  const talk = useRef<Converse | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [setAside, setSetAside] = useState<string | null>(null);
  const appRef = useRef(app);
  useEffect(() => {
    appRef.current = app;
  });
  const feedRef = useRef<ReplyFeed | null>(null);

  /** Opens the reply's voice now: a voice-mode sentence feed spoken through the app voice. */
  const startReply = useCallback((): ReplyFeed => {
    const { out, band } = appRef.current;
    feedRef.current?.abort();
    question.current = false;
    const feed = sentenceFeed({
      mode: "voice",
      release: (s, i) => {
        if (i === 0) marks.current.firstSentence = now();
        question.current = /[?¿]["'”’)]*\s*$/.test(s);
        return s;
      },
    });
    const run = talk.current ? talk.current.say(feed.sentences, { kind: "reply", band }) : out.speak(feed.sentences, { kind: "reply", band });
    replyRun.current = run.id;
    feedRef.current = feed;
    return feed;
  }, []);

  const dispatch = useCallback(function dispatch(e: ConvEvent) {
    const r = convStep(sRef.current, e);
    sRef.current = r.state;
    setState(r.state);
    if (e.type !== "tick" && e.type !== "partial") logVoice(`conv:${e.type}`, { phase: r.state.phase });
    for (const fx of r.effects) runEffect(fx);
    clearTimeout(timer.current);
    const at = wakeAt(r.state);
    if (at != null) timer.current = setTimeout(() => dispatch({ type: "tick", at: now() }), Math.max(0, at - now()) + 1);

    function runEffect(fx: Effect) {
      const { in: input, out, band } = appRef.current;
      const h = handlers.current;
      switch (fx.type) {
        case "open-mic":
          talk.current?.listening();
          void input?.start({ turns: "auto", band, keyterms: h.keyterms, answer: h.answer ? (t) => h.answer!(t)?.certainty === "sure" : undefined }).catch(() => {});
          break;
        case "close-mic":
          input?.stop();
          break;
        case "abort-mic":
          input?.abort();
          break;
        case "send":
        case "retry": {
          marks.current.requestSent = now();
          posted.current = false;
          logVoice("send", { speculative: fx.type === "send" && fx.speculative });
          const reply = startReply();
          h.onSend(fx.text, { via: "voice", confidence: confidence.current, speculative: fx.type === "send" && fx.speculative, retry: fx.type === "retry", reply });
          break;
        }
        case "commit":
          h.onCommit?.();
          break;
        case "abort-request":
          // The speculative reply goes too: nothing of it is spoken.
          feedRef.current?.abort();
          feedRef.current = null;
          if (replyRun.current != null) out.cancel({ fadeMs: 0 });
          replyRun.current = null;
          h.onAbortRequest?.();
          break;
        case "stop-reply":
          h.onStopReply?.(out.heardUpTo());
          break;
        case "stop-voice":
          out.cancel({ fadeMs: fx.fadeMs });
          break;
        case "mode":
          break;
      }
    }
  }, [startReply]);

  // A new learner, language or voice: start over.
  useEffect(() => {
    sRef.current = start();
    setState(sRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [app.band, app.conversation, app.in]);

  useEffect(() => {
    const input = app.in;
    const out = app.out;
    if (!app.ready) return;
    const siblings = app.learner?.siblings ?? [];
    const c = converse({
      input,
      output: out,
      locale: app.learner?.locale ?? "en",
      names: app.learner?.names ?? [],
      onTurn: (text, meta) => {
        marks.current = { lastWordEnd: meta.lastWordEnd ?? undefined, eot: now() };
        confidence.current = meta.confidence;
        dispatch({ type: "turn", text, at: now(), confidence: meta.confidence, addressee: addressesSomeoneElse(text, siblings), reading: handlers.current.answer?.(text)?.reading });
      },
      onBargeIn: () => dispatch({ type: "barge", at: now() }),
      onDuck: (on) => dispatch({ type: "duck", on, at: now() }),
      onEcho: (t) => setSetAside(t),
      onHalfDuplex: () => dispatch({ type: "half-duplex", at: now() }),
      onMicOff: (why) => dispatch({ type: "mic-off", why, at: now() }),
      onMetric: (m) => {
        if (m.name !== "barge-in") return;
        const t = now();
        marks.current.bargeOnset = t - m.stopMs;
        marks.current.bargeDuck = m.duckMs != null ? t - m.stopMs + m.duckMs : undefined;
        marks.current.bargeStop = t;
        logVoice("barge-in", { duckMs: m.duckMs, stopMs: m.stopMs });
      },
    });
    talk.current = c;
    const subs = [
      input?.onSpeechStart(() => dispatch({ type: "speech-start", at: now() })),
      input?.onPartial((text) => dispatch({ type: "partial", text, at: now() })),
      input?.onEagerEnd((text, meta) => {
        marks.current = { lastWordEnd: meta.lastWordEnd ?? undefined, eot: now() };
        confidence.current = meta.confidence;
        dispatch({ type: "eager", text, at: now(), confidence: meta.confidence, addressee: addressesSomeoneElse(text, siblings) });
      }),
      input?.onTurnResumed(() => dispatch({ type: "resumed", at: now() })),
      input?.onSlow((on) => dispatch({ type: "slow", on, at: now() })),
      input?.onError((e) => dispatch({ type: "error-in", code: e.code, at: now() })),
      out.onStart((run) => run === replyRun.current && dispatch({ type: "first-audio", at: now() })),
      out.onEnd((e, run) => {
        if (run !== replyRun.current) return;
        replyRun.current = null;
        dispatch({ type: "reply-end", at: now(), question: question.current, cancelled: e.cancelled });
      }),
      out.onError((_, run) => run === replyRun.current && dispatch({ type: "error-out", at: now() })),
      out.onTiming((t) => {
        if (t.run !== replyRun.current || t.firstAudibleAt == null || posted.current || marks.current.lastWordEnd == null) return;
        posted.current = true;
        marks.current.firstChunk = t.firstChunkAt ?? undefined;
        marks.current.firstAudible = t.firstAudibleAt;
        const a = appRef.current;
        const stt = (a.in as { model?: "flux" | "nova" | null } | null)?.model;
        const metric = metricOf(marks.current, {
          band: a.band,
          locale: a.learner?.locale ?? "en",
          in: a.in ? a.in.kind : "none",
          out: t.vendor,
          stt: a.in?.kind === "deepgram" ? (stt ?? "flux") : a.in ? "browser" : "none",
          mode: sRef.current.mode,
          underruns: t.underruns,
          retried: t.retried,
        });
        logVoice("turn", { segments: metric.segments });
        postMetric(metric);
      }),
    ];
    const hidden = () => document.hidden && dispatch({ type: "hidden", at: now() });
    const pagehide = () => dispatch({ type: "hidden", at: now() });
    const offline = () => dispatch({ type: "offline", at: now() });
    document.addEventListener("visibilitychange", hidden);
    window.addEventListener("pagehide", pagehide);
    window.addEventListener("offline", offline);
    (input as { prepare?: () => void } | null)?.prepare?.();
    return () => {
      c.dispose();
      talk.current = null;
      subs.forEach((u) => u?.());
      document.removeEventListener("visibilitychange", hidden);
      window.removeEventListener("pagehide", pagehide);
      window.removeEventListener("offline", offline);
      clearTimeout(timer.current);
      // Leaving the screen is a route change: the microphone closes, this screen's reply stops.
      input?.abort();
      if (replyRun.current != null) out.cancel();
    };
  }, [app.ready, app.in, app.out, app.learner, dispatch]);

  return {
    state,
    mic: () => {
      app.warm();
      dispatch({ type: "mic", at: now() });
    },
    stopVoice: () => dispatch({ type: "stop-voice", at: now() }),
    setMode: (mode) => dispatch({ type: "mode", mode, at: now() }),
    confirmSend: () => dispatch({ type: "confirm-send", at: now() }),
    confirmAgain: () => dispatch({ type: "confirm-again", at: now() }),
    retry: () => dispatch({ type: "retry", at: now() }),
    reply: startReply,
    markFirstToken: () => {
      marks.current.firstToken ??= now();
    },
    markAck: () => {
      marks.current.ack ??= now();
    },
    setAside,
    sendSetAside: () => {
      const t = setAside;
      if (!t) return;
      setSetAside(null);
      dispatch({ type: "turn", text: t, at: now(), confidence: null });
    },
    level: () => app.in?.level() ?? null,
    heardUpTo: () => app.out.heardUpTo(),
  };
}
