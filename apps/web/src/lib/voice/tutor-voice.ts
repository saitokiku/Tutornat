"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { addressesSomeoneElse } from "./addressee";
import { sentenceFeed } from "./chunk";
import { convStart, convStep, sameTurn, wakeAt, type ConvEvent, type ConvState, type Effect, type Mode } from "./conversation";
import { converse, type Converse } from "./converse";
import { logVoice, metricOf, postMetric, type TurnMarks } from "./metrics";
import { useAppVoice } from "./root";

// The talking tutor's loop for a screen (Talk, the drawer beside a problem): the app voice, the
// two-way listener (./converse) and the state machine (./conversation), with the screen's chat
// behind three callbacks. The screen renders `state` (the VoiceBar of spec §5.1) and streams each
// reply into `reply()`; everything else — the microphone, barge-in, echo, conversation mode, honest
// waiting, the latency log — happens here.
//
// A reply is read aloud only with a voice that may read by itself (vendor or Tier A: app.autoRead)
// or when the screen asks (speakReplies, the read-aloud toggle). Otherwise its words are only shown:
// a Tier B voice never auto-reads (spec §4, §8.5), and a Hear the learner tapped keeps playing.
// A reply sent at the eager end of turn opens its voice at once, but nothing of it is heard until
// its turn is committed.

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
  /**
   * Read replies aloud (the screen's read-aloud toggle). Defaults to useAppVoice().autoRead: on with
   * the vendor voice or a Tier A one, off with a Tier B one (then replies are shown, not spoken).
   */
  speakReplies?: boolean;
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
  /** The model's stream failed: what arrived is spoken, then "Lost the connection" with Try again (call after replyFeed.end()). */
  streamError(): void;
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
const QUESTION = /[?¿]["'”’)]*\s*$/;

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
  /** The reply being timed came from a spoken turn (only those are turn latency). */
  const timed = useRef(false);
  const confidence = useRef<number | null>(null);
  const replyRun = useRef<number | null>(null);
  /** A reply shown but not spoken: its feed, so ending it settles the state machine. */
  const silent = useRef<object | null>(null);
  /** A speculative reply's audio waits for this. */
  const commit = useRef<(() => void) | null>(null);
  const question = useRef(false);
  const talk = useRef<Converse | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [setAside, setSetAside] = useState<string | null>(null);
  const appRef = useRef(app);
  useEffect(() => {
    appRef.current = app;
  });
  const feedRef = useRef<ReplyFeed | null>(null);
  const dispatchRef = useRef<(e: ConvEvent) => void>(() => {});

  /**
   * Opens the reply's voice now: a voice-mode sentence feed spoken through the app voice, or, when
   * replies aren't read aloud, only drained so its end still settles the loop. `voice`: it answers a
   * spoken turn (timed for the latency log). `speculative`: held until the turn is committed.
   */
  const startReply = useCallback(({ voice = false, speculative = false } = {}): ReplyFeed => {
    const { out, band, autoRead } = appRef.current;
    feedRef.current?.abort();
    silent.current = null;
    commit.current = null;
    question.current = false;
    timed.current = voice;
    if (!voice) marks.current = {};
    posted.current = false;
    const feed = sentenceFeed({
      mode: "voice",
      release: (s, i) => {
        if (i === 0) {
          marks.current.firstSentence = now();
          dispatchRef.current({ type: "reply-text", at: now() });
        }
        question.current = QUESTION.test(s);
        return s;
      },
    });
    feedRef.current = feed;
    const after = speculative ? new Promise<void>((ok) => (commit.current = ok)) : undefined;
    if (!(handlers.current.speakReplies ?? autoRead)) {
      // Shown, not spoken: nothing is said, and nothing else that is playing (a Hear) is cut off.
      const mine = {};
      silent.current = mine;
      replyRun.current = null;
      void (async () => {
        for await (const s of feed.sentences) question.current = QUESTION.test(s);
        await after; // a speculative reply ends only once its turn stands
        if (silent.current === mine) {
          silent.current = null;
          dispatchRef.current({ type: "reply-end", at: now(), question: question.current, cancelled: false });
        }
      })();
      return feed;
    }
    const sayOpts = { kind: "reply" as const, band, after };
    const run = talk.current ? talk.current.say(feed.sentences, sayOpts) : out.speak(feed.sentences, sayOpts);
    replyRun.current = run.id;
    return feed;
  }, []);

  const dispatch = useCallback(
    function dispatch(e: ConvEvent) {
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
            if (fx.type === "retry") marks.current = {}; // Try again is not a spoken turn's latency
            marks.current.requestSent = now();
            const speculative = fx.type === "send" && fx.speculative;
            logVoice("send", { speculative });
            const reply = startReply({ voice: fx.type === "send", speculative });
            h.onSend(fx.text, { via: "voice", confidence: confidence.current, speculative, retry: fx.type === "retry", reply });
            break;
          }
          case "commit":
            // The speculative reply stands: its held audio may now be heard.
            commit.current?.();
            commit.current = null;
            h.onCommit?.();
            break;
          case "abort-request": {
            // The speculative (or superseded) reply goes too: nothing more of it is spoken.
            feedRef.current?.abort();
            feedRef.current = null;
            silent.current = null;
            commit.current = null;
            const run = replyRun.current;
            replyRun.current = null;
            if (run != null) out.cancel({ fadeMs: 0 });
            h.onAbortRequest?.();
            break;
          }
          case "stop-reply":
            h.onStopReply?.(out.heardUpTo());
            break;
          case "stop-voice":
            // This screen's reply only: a Hear or narration playing meanwhile is not the tutor's to stop.
            if (replyRun.current != null) out.cancel({ fadeMs: fx.fadeMs });
            break;
          case "mode":
            break;
        }
      }
    },
    [startReply],
  );
  useEffect(() => {
    dispatchRef.current = dispatch;
  }, [dispatch]);

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
        // The turn the eager end already sent: its marks (request, first sentence) stand.
        const t = sRef.current.turn;
        if (!(t?.speculative && sameTurn(t.text, text))) marks.current = { lastWordEnd: meta.lastWordEnd ?? undefined, eot: now() };
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
        // Times from the learner's first sound (onsetAt, the mic frame's capture time), not from detection.
        marks.current.bargeOnset = m.onsetAt;
        marks.current.bargeDuck = m.duckMs != null ? m.onsetAt + m.duckMs : undefined;
        marks.current.bargeStop = m.onsetAt + m.stopMs;
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
      // The vendor recognizer was lost for good: the browser's is half duplex and tap mode only.
      input?.onSwitch?.((to) => dispatch({ type: "recognizer", duplex: to.duplex, vendor: to.kind !== "browser", at: now() })),
      out.onStart((run) => run === replyRun.current && dispatch({ type: "first-audio", at: now() })),
      out.onEnd((e, run) => {
        if (run !== replyRun.current) return;
        replyRun.current = null;
        dispatch({ type: "reply-end", at: now(), question: question.current, cancelled: e.cancelled });
      }),
      out.onError((_, run) => run === replyRun.current && dispatch({ type: "error-out", at: now() })),
      out.onTiming((t) => {
        if (t.run !== replyRun.current || t.firstAudibleAt == null || posted.current || !timed.current || marks.current.lastWordEnd == null) return;
        posted.current = true;
        marks.current.firstChunk = t.firstChunkAt ?? undefined;
        marks.current.firstAudible = t.firstAudibleAt;
        const a = appRef.current;
        const stt = a.in?.model;
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
        // A turn out of range (a stuck clock) is left out rather than sent and refused.
        if (Object.values(metric.segments).every((v) => v == null || v <= 120_000)) postMetric(metric);
      }),
    ];
    const hidden = () => document.hidden && dispatch({ type: "hidden", at: now() });
    const pagehide = () => dispatch({ type: "hidden", at: now() });
    const offline = () => dispatch({ type: "offline", at: now() });
    document.addEventListener("visibilitychange", hidden);
    window.addEventListener("pagehide", pagehide);
    window.addEventListener("offline", offline);
    const unprepare = input?.prepare?.();
    return () => {
      unprepare?.();
      c.dispose();
      talk.current = null;
      subs.forEach((u) => u?.());
      document.removeEventListener("visibilitychange", hidden);
      window.removeEventListener("pagehide", pagehide);
      window.removeEventListener("offline", offline);
      clearTimeout(timer.current);
      // Leaving the screen is a route change: the microphone closes, this screen's reply stops.
      input?.abort();
      feedRef.current?.abort();
      silent.current = null;
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
    streamError: () => dispatch({ type: "stream-error", at: now() }),
    reply: () => startReply(),
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
