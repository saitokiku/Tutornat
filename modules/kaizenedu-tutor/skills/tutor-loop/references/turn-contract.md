# Turn contract (what `lib/tutor` exposes to the session UI)

Derived from the playback and orchestration maps in `docs/ARCHITECTURE-MAP.md`.

```ts
export type TutorPhase = 'idle' | 'listening' | 'thinking' | 'speaking';

export interface TutorTurnHandle {
  readonly turnId: string;
  push(action: TutorAction): void;          // non-blocking; the board animates on its own
  pushSpeechDelta(text: string): void;      // drives reveal + sentence-level TTS
  sealSpeech(): void;                       // releases the TTS hold for the current segment
  end(): void;
  settled(): Promise<void>;                 // every action applied, narration finished
}

export interface TutorOrchestrator {
  beginTurn(opts?: { turnId?: string }): TutorTurnHandle;   // interrupts any turn in flight
  interrupt(reason: 'user_speech' | 'user_text' | 'manual'): void;
  // stops TTS ≤ 300 ms, drops queued actions, aborts in-flight executors via AbortSignal,
  // bumps the generation token so no late continuation writes; set the phase BEFORE stopping
  // audio (speechSynthesis.cancel can fire onend synchronously; lib/playback/engine.ts:459-467)
  getPhase(): TutorPhase;
  onPhaseChange(cb: (phase: TutorPhase) => void): () => void;
  getBoardSnapshot(): Readonly<Whiteboard> | null;   // feeds the next prompt's board context
  dispose(): void;
}

export interface WhiteboardSink {
  apply(action: TutorAction, opts?: { signal?: AbortSignal }): Promise<void>; // resolves on commit, never awaits animation
  replay(actions: readonly TutorAction[]): Promise<void>;                      // silent restore
  snapshot(): Readonly<Whiteboard> | null;
  subscribe(cb: (wb: Readonly<Whiteboard> | null) => void): () => void;
  clear(): Promise<void>;
}

export interface VoiceSink {
  speak(text: string, opts?: { signal?: AbortSignal }): Promise<void>; // one sentence
  isBusy(): { busy: boolean; segmentsDone: number };
  cancel(): void;   // hard stop, drop the queue
  pause(): void;
  resume(): void;
}
```

New actions the DSL needs: `wb_stroke { points: [x, y][]; color?; width? }` and `wb_highlight { elementId? | bbox? }`. The three blockers in the engine: `lib/action/engine.ts` sleeps per `wb_*` (remove), ignores `AbortSignal` in `wb_*` executors (honour), and has no stroke or highlight primitive (add).
