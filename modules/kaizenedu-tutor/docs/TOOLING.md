# Tooling record (Phase 0 step 4)

How this was produced: the documentation sites for every library below are blocked from this environment, so each library was learned from its published npm tarball (README plus `.d.ts` type definitions) installed on 2026-09-04 into a scratch directory. Every signature in the per-library sections cites the file it was copied from; anything the package files could not confirm is marked NOT CONFIRMED FROM PACKAGE FILES. None of these libraries is in the product `package.json` yet; the issue that first uses one adds it with the one-line justification the repo rules require.

## Versions

Installed in this repo (`node_modules`, from upstream's lockfile):

| Package | Version | Where it matters |
| --- | --- | --- |
| next | 16.2.11 | App Router, route groups, `middleware.ts`, `instrumentation.ts` |
| react / react-dom | 19.2.3 | |
| @langchain/langgraph / @langchain/core | 1.2.2 / 1.1.31 | upstream `/api/chat` director graph (not used by the tutor loop) |
| ai (Vercel AI SDK) | 6.0.168 | `generateText` / `streamText` behind `lib/ai/llm.ts` only |
| @ai-sdk/openai / anthropic / google / azure | 3.0.84 / 3.0.71 / 3.0.64 / 3.0.88 | provider transports |
| @earendil-works/pi-agent-core, pi-ai | 0.78.0 (pinned) | the pi runtime the tutor loop builds on |
| zustand | 5.0.11 | stores; persisted through `lib/store/kv-persist.ts` |
| tailwindcss / @tailwindcss/postcss | 4.2.1 | `@theme inline` tokens in `app/globals.css` |
| motion | 12.35.2 | `motion/react` in 43 files |
| vitest | 4.1.8 | `tests/**/*.test.ts` |
| @playwright/test | 1.58.2 | `e2e/`, Chromium only, port 3002 |
| typescript | 5.9.3 | strict |
| pg / @electric-sql/pglite | 8.22.0 / 0.3.16 | Postgres; PGlite in tests |
| zod | 4.3.6 | |
| i18next | 26.0.1 | 12 locales, default `zh-CN` |
| lucide-react | 0.562.0 | the one icon family |
| dexie | 4.3.0 | browser-only persistence mode |

Current registry versions of the libraries the spec adds (checked with `npm view` on 2026-09-04):

| Package | Version | Used by |
| --- | --- | --- |
| @rive-app/canvas / @rive-app/react-canvas | 2.42.0 / 4.34.0 | presence-38 (2D rig) |
| @lottiefiles/dotlottie-react / lottie-web | 0.19.16 / 5.13.0 | presence-38 fallback |
| @mediapipe/tasks-vision | 1.0.1 | presence-41 |
| @ricky0123/vad-web | 0.0.30 | voice-17 |
| @clerk/nextjs | 7.9.1 | auth-21 |
| stripe | 22.6.1 | billing-23 |
| posthog-js / posthog-node | 1.426.2 / 5.51.6 | data-29 |
| @sentry/nextjs | 10.73.0 | data-29 |
| resend | 6.26.0 | R18 |
| @neondatabase/serverless | 1.1.0 | infra-02 (optional; `pg` over Neon's pooled endpoint also works) |
| heic-convert | 2.1.0 | upload-20 |
| @pixiv/three-vrm | 3.5.5 | R31 (3D rig, later) |

## Snippets that ran here

Offline-verifiable behaviour, run with Node 22 against the installed tarballs (`scratchpad/libs/snippets.mjs`):

```
stripe 22.6.1: constructEvent ok, type=customer.subscription.deleted
stripe: wrong secret -> StripeSignatureVerificationError
heic-convert: non-HEIC -> TypeError: input buffer is not a HEIC image
resend: client has emails.send=function
neon: neon() -> function, has transaction=function
posthog-node: capture=function, shutdown=function
mediapipe exports: FilesetResolver,FaceLandmarker
vad-web exports: MicVAD,utils
```

Not run here: anything that needs a browser (Rive rendering, MediaPipe inference, `MicVAD` capture, Clerk components, posthog-js), a network (Resend send, Neon queries, PostHog capture, Sentry), or a key (Stripe API calls). `@rive-app/canvas` imported under Node exposes its API on the CommonJS default export, which is why the ESM named-export probe printed nothing; it is a browser library.

## Gotchas that change our design

1. Rive 2.42 deprecates state-machine inputs, `onStateChange`, Rive Events, and text runs in favour of data binding (`ViewModelInstance`, `useViewModelInstance*`). They still work; model `{state, mouth, gaze, expression}` as view-model properties for a new rig.
2. Rive fetches its WASM from unpkg/jsdelivr by default; self-host with `RuntimeLoader.setWasmUrl()` and `setWasmFallbackUrl(null)` before constructing (no third-party loads on learner surfaces).
3. Rive has no `prefers-reduced-motion` handling; only `visibilitychange` pausing and, in `useRive`, an IntersectionObserver. Reduced motion is ours to implement in the `AvatarDriver`.
4. MediaPipe ships about 12 MB of WASM and no model: copy `wasm/` to `public/` without renaming (the loader builds `vision_wasm[_nosimd]_internal.js/.wasm` names at runtime) and self-host `face_landmarker.task`. Default delegate is CPU; GPU needs a WebGL2 canvas.
5. Blendshape category names (`eyeBlinkLeft`) and the transformation-matrix layout are not in the package: look categories up by `categoryName` defensively and validate yaw/pitch signs live. The README's privacy notice says frames stay on device but usage metrics go to Google; disable that or confirm it sends nothing about the learner before Gate 2 (minors-privacy vendor review).
6. vad-web 0.0.30 option names are `redemptionMs`, `preSpeechPadMs`, `minSpeechMs` (no `redemptionFrames`) and `getStream` (no `stream`). `onSpeechStart` fires on the first positive frame with no debounce; use `model: 'v5'` (32 ms frames), because the default `legacy` model is 96 ms per frame and would blow the barge-in budget. Confirm with `onSpeechRealStart`, roll back on `onVADMisfire`.
7. VAD assets to serve from our origin: `vad.worklet.bundle.min.js` and `silero_vad_v5.onnx` from `baseAssetPath`, and onnxruntime-web 1.29.0's `ort-wasm-simd-threaded.*` (about 14 MB) from `onnxWASMBasePath`; both need a trailing slash. `startOnLoad: true` requests the mic inside `MicVAD.new()`; call it inside a user gesture.
8. Clerk: import `auth()` and `currentUser()` only from `@clerk/nextjs/server`; `auth()` is async; `auth.protect()` answers 404, not 401, for unauthenticated API calls; `createRouteMatcher` is deprecated in favour of per-route checks; `currentUser()` is a rate-limited Backend API call, so use `auth()` for identity. Next 16 is inside the peer range; the `proxy.ts` convention is not mentioned by the package (not confirmed).
9. Clerk custom claims go through the global `CustomJwtSessionClaims` augmentation; `orgId`, `orgRole`, `orgSlug`, `orgPermissions` already exist on the auth object.
10. Stripe 22.6: `Stripe.Event` is a real discriminated union (`switch (event.type)` narrows); `current_period_end` lives on `SubscriptionItem`, not `Subscription`; meter-event payload values must be strings and `identifier` is the idempotency key; keep webhooks on the Node runtime.
11. posthog-js: `disable_external_dependency_loading: true` is the hard guarantee that no replay or survey script loads; also set `disable_session_recording`, `disable_surveys`, `autocapture: false`, `capture_pageview: false` (it silently becomes `'history_change'` with newer `defaults`), and `capture_heatmaps`, `capture_dead_clicks`, `capture_exceptions: false`.
12. posthog-node batches (`flushAt` 20 / 5 s): `await flush()` or `shutdown()` before a serverless response returns or events are lost.
13. Sentry: Replay and Feedback are not in the browser defaults; never call `replayIntegration()`, and still set both `replays*SampleRate: 0`. `sendDefaultPii` is deprecated in favour of `dataCollection`; scrub in `beforeSend` and `beforeBreadcrumb`; `setUser({ id })` only.
14. Sentry for Next 16 with Turbopack: `instrumentation-client.ts` (the build warns that `sentry.client.config.ts` will stop working), `instrumentation.ts` with `register()` and `onRequestError = captureRequestError`; import `withSentryConfig` from `@sentry/nextjs/config`.
15. `resend.emails.send()` returns `{data, error}` and never throws on API errors; Neon's `neon()` is one fetch per query (batch with `sql.transaction([...])`), and `Pool`/`Client` must be created and ended inside a request on Vercel; `heic-convert` is Node-only, untyped, CPU-heavy, and throws `TypeError` on non-HEIC input.

---

# Third-party library reference (verified against installed package files)

Source root (`<NM>` below) = `/tmp/claude-0/-home-user-KaizenEdu/d7e67f4b-0197-58a7-9fcd-9b25d2cf2bfc/scratchpad/libs/node_modules`.
Every signature is copied from a `.d.ts`/README/JS file under `<NM>`; anything not found there is marked **NOT CONFIRMED FROM PACKAGE FILES**. Target stack: Next.js 16 / React 19 / TS strict.

---

## 1. `@rive-app/canvas` 2.42.0 + `@rive-app/react-canvas` 4.34.0

- Install: `npm i @rive-app/react-canvas` (depends on `@rive-app/canvas@2.42.0` exactly; peer `react ^16.8.0 || ^17.0.0 || ^18.0.0 || ^19.0`). `@rive-app/canvas` has no deps/peers. (`<NM>/@rive-app/*/package.json`)
- Files shipped: `rive.js` (450 KB), `rive.wasm` (1.9 MB), `rive_fallback.wasm` (1.9 MB), `rive.d.ts`, `runtimeLoader.d.ts`.

### Core API (`<NM>/@rive-app/canvas/rive.d.ts`)
```ts
export interface RiveParameters {
  canvas: HTMLCanvasElement | OffscreenCanvas;
  src?: string; buffer?: ArrayBuffer; riveFile?: RiveFile;
  artboard?: string; stateMachine?: string;            // singular; `animations`/`stateMachines` are @deprecated
  layout?: Layout; autoplay?: boolean; useOffscreenRenderer?: boolean;
  shouldDisableRiveListeners?: boolean; isTouchScrollEnabled?: boolean; autoBind?: boolean;
  drawingOptions?: DrawOptimizationOptions; enablePerfMarks?: boolean;
  onLoad?: EventCallback; onLoadError?: EventCallback; onPlay?: EventCallback; onPause?: EventCallback; onStop?: EventCallback;
  /** @deprecated State change events are deprecated ... use data binding */ onStateChange?: EventCallback;
  onAdvance?: EventCallback; assetLoader?: AssetLoadCallback;
}
export declare class Rive {
  constructor(params: RiveParameters);  static new(params: RiveParameters): Rive;
  play(animationNames?: string | string[], autoplay?: true): void;  pause(animationNames?: string | string[]): void;
  stop(animationNames?: string | string[] | undefined): void;
  cleanup(): void;                     // destroys wasm artboard/state machine/renderer/file — instance unusable after
  resizeToCanvas(): void;  resizeDrawingSurfaceToCanvas(customDevicePixelRatio?: number): void;
  get stateMachineNames(): string[];
  /** @deprecated ... use data binding */ stateMachineInputs(name: string): StateMachineInput[] | undefined;
  /** @deprecated */ setBooleanStateAtPath(inputName: string, value: boolean, path: string): void;
  /** @deprecated */ setNumberStateAtPath(inputName: string, value: number, path: string): void;
  /** @deprecated */ fireStateAtPath(inputName: string, path: string): void;
  on(type: EventType, callback: EventCallback): void;  off(type: EventType, callback: EventCallback): void;
  stopRendering(): void;  startRendering(): void;      // rAF loop only; animation state untouched
  bindViewModelInstance(viewModelInstance: ViewModelInstance | null): void;  get viewModelInstance(): ViewModelInstance | null;
  defaultViewModel(): ViewModel | null;  viewModelByName(name: string): ViewModel | null;
}
export declare enum StateMachineInputType { Number = 56, Trigger = 58, Boolean = 59 }   // @deprecated
export declare class StateMachineInput {                                               // @deprecated
  readonly type: StateMachineInputType;  get name(): string;
  get value(): number | boolean;  set value(value: number | boolean);
  fire(): void;   // "Fires a trigger; does nothing on Number or Boolean input types"
  delete(): void;
}
export declare enum EventType { Load = "load", LoadError = "loaderror", Play = "play", Pause = "pause", Stop = "stop",
  Loop = "loop", Draw = "draw", Advance = "advance", StateChange = "statechange", RiveEvent = "riveevent", AudioStatusChange = "audiostatuschange" }
export interface Event { type: EventType; data?: string | string[] | LoopEvent | number | RiveEventPayload | RiveFile; }
export type EventCallback = (event: Event) => void;
export interface LayoutParameters { fit?: Fit; alignment?: Alignment; layoutScaleFactor?: number; minX?: number; minY?: number; maxX?: number; maxY?: number; }
export declare class Layout { constructor(params?: LayoutParameters); }
export declare enum Fit { Cover = "cover", Contain = "contain", Fill = "fill", FitWidth = "fitWidth", FitHeight = "fitHeight", None = "none", ScaleDown = "scaleDown", Layout = "layout" }
export declare enum Alignment { Center = "center", TopLeft = "topLeft", /* ...TopCenter, TopRight, CenterLeft, CenterRight, BottomLeft, BottomCenter, BottomRight */ }
// Data binding (the non-deprecated replacement for inputs):
export declare class ViewModel { instanceByName(name: string): ViewModelInstance | null; defaultInstance(): ViewModelInstance | null; instance(): ViewModelInstance; }
export declare class ViewModelInstance {
  number(path: string): ViewModelInstanceNumber | null;  boolean(path: string): ViewModelInstanceBoolean | null;
  trigger(path: string): ViewModelInstanceTrigger | null;  enum(path: string): ViewModelInstanceEnum | null;  string(path: string): ViewModelInstanceString | null;
}
export declare class ViewModelInstanceValue { on(callback: EventCallback): void; off(callback?: EventCallback): void; get name(): string; }
export declare class ViewModelInstanceNumber extends ViewModelInstanceValue { get value(): number; set value(val: number); }   // Boolean: boolean value; String: string value
export declare class ViewModelInstanceEnum extends ViewModelInstanceValue { get value(): string; set value(val: string); get values(): string[]; }  // Trigger: trigger(): void
```
`<NM>/@rive-app/canvas/runtimeLoader.d.ts`:
```ts
export declare class RuntimeLoader {
  static getInstance(callback: RuntimeCallback, onError?: (error: Error) => void): void;
  static awaitInstance(): Promise<rc.RiveCanvas>;
  static setWasmUrl(url: string): void;  static getWasmUrl(): string;
  static setWasmFallbackUrl(url: string | null): void;   // "Pass `null` to disable the fallback entirely. Defaults to pulling from the jsdelivr CDN."
  static setWasmBinary(value: ArrayBuffer | null): void;
}
```
### React hooks (`<NM>/@rive-app/react-canvas/dist/types/index.d.ts`; re-exports everything from `@rive-app/canvas`)
```ts
declare function useRive(riveParams?: UseRiveParameters, opts?: Partial<UseRiveOptions>): RiveState;
type UseRiveParameters = (Partial<Omit<RiveParameters, 'canvas'>> & { onRiveReady?: (rive: Rive$1) => void; }) | null;
type UseRiveOptions = { useDevicePixelRatio: boolean; customDevicePixelRatio: number; fitCanvasToArtboardHeight: boolean;
  useOffscreenRenderer: boolean; shouldResizeCanvasToContainer: boolean; shouldUseIntersectionObserver?: boolean; };
type RiveState = { canvas: HTMLCanvasElement | null; container: HTMLElement | null; setCanvasRef: RefCallback<HTMLCanvasElement>;
  setContainerRef: RefCallback<HTMLElement>; rive: Rive$1 | null; RiveComponent: (props: ComponentProps<'canvas'>) => JSX.Element; };
/** @deprecated ... use data binding properties instead */
declare function useStateMachineInput(rive: Rive$1 | null, stateMachineName?: string, inputName?: string, initialValue?: number | boolean): StateMachineInput | null;
declare function useViewModel(rive: Rive$1 | null, params?: UseViewModelParameters): ViewModel | null;              // { name } | { useDefault }
declare function useViewModelInstance(viewModel: ViewModel | null, params?: UseViewModelInstanceParameters): ViewModelInstance | null; // { name | useDefault | useNew, rive? }
declare function useViewModelInstanceNumber(path: string, viewModelInstance?: ViewModelInstance | null): { value: number | null; setValue: (value: number) => void };
declare function useViewModelInstanceBoolean(path: string, viewModelInstance?: ViewModelInstance | null): { value: boolean | null; setValue: (value: boolean) => void };
declare function useViewModelInstanceEnum(path: string, viewModelInstance?: ViewModelInstance | null): { value: string | null; setValue: (value: string) => void; values: string[] };
declare function useViewModelInstanceTrigger(path: string, viewModelInstance?: ViewModelInstance | null, params?: { onTrigger?: () => void }): { trigger: () => void };
```
### Gotchas
1. **Inputs are deprecated.** In 2.42.0 `StateMachineInput`, `stateMachineInputs()`, `onStateChange`/`EventType.StateChange`, Rive Events, text runs and `animations`/`stateMachines` (plural) all carry `@deprecated` ("will be removed in a future major version: please use data binding properties instead"). They still work. For a new face rig, expose `{state, mouth, gaze, expression}` as view-model properties (enum/number) and use `useViewModelInstance*`; set `autoBind: true` (or `useViewModelInstance(vm, { useDefault: true, rive })`) so the default view model is bound.
2. **WASM comes from a CDN by default.** `rive.js` sets `wasmURL = "https://unpkg.com/@rive-app/canvas@2.42.0/rive.wasm"` and `wasmFallbackURL = "https://cdn.jsdelivr.net/npm/@rive-app/canvas@2.42.0/rive_fallback.wasm"`. For CSP/privacy/offline, copy `rive.wasm` to `public/` and call `RuntimeLoader.setWasmUrl('/rive/rive.wasm')` (and `setWasmFallbackUrl(null)`) **before** the first `Rive` is constructed.
3. **"single" build variant** (`@rive-app/canvas-single`, wasm inlined) is not installed: NOT CONFIRMED FROM PACKAGE FILES. The regular build's README only says it "Requests the Web Assembly (WASM) backing dependency for you".
4. **No `prefers-reduced-motion` handling** in either package (0 grep hits). The runtime only pauses its rAF loop on `document.visibilitychange` (private `_onPageVisibilityChange`: "Cancels the rAF loop on hide and resets the time reference"). `useRive` additionally uses an IntersectionObserver to call `stopRendering()` off-screen / `startRendering()` on-screen (`shouldUseIntersectionObserver`, on by default; `dist/index.js`). Implement reduced motion yourself (`matchMedia` → `rive.pause()` or a "calm" input). `drawingOptions: DrawOptimizationOptions.DrawOnChanged` skips redraws when nothing changed.
5. **Resize/DPR.** `useRive` resizes the canvas to its container via ResizeObserver when you render `RiveComponent` (or pass `setContainerRef`) and tracks DPR with `window.matchMedia("screen and (resolution: Ndppx)")`. With the plain class, call `rive.resizeDrawingSurfaceToCanvas()` in your resize handler (sets `devicePixelRatioUsed`).
6. **Cleanup.** `useRive` calls `cleanup()` on unmount; with the class you must call `rive.cleanup()` yourself. `statechange` payload is `string[]` of state names (`Animator.prototype.handleStateChanges` → `data: statesChanged`, `rive.js:4363-4375`).
7. `shouldDisableRiveListeners: true` avoids attaching pointer/touch listeners to the `<canvas>` (the face is not interactive; also avoids touch-scroll interference).

### Snippet
```tsx
'use client';
import { useEffect } from 'react';
import { useRive, useStateMachineInput, RuntimeLoader, Layout, Fit, Alignment } from '@rive-app/react-canvas';
RuntimeLoader.setWasmUrl('/rive/rive.wasm'); RuntimeLoader.setWasmFallbackUrl(null); // copied from node_modules/@rive-app/canvas/

export function TutorFace(p: { state: number; mouth: number; gaze: number; expression: number }) {
  const { rive, RiveComponent } = useRive({
    src: '/rive/tutor.riv', artboard: 'Face', stateMachine: 'FaceSM', autoplay: true,
    layout: new Layout({ fit: Fit.Contain, alignment: Alignment.Center }), shouldDisableRiveListeners: true,
  });
  const stateIn = useStateMachineInput(rive, 'FaceSM', 'state');   // deprecated-but-working input path
  const mouthIn = useStateMachineInput(rive, 'FaceSM', 'mouth');
  const gazeIn = useStateMachineInput(rive, 'FaceSM', 'gaze');
  const exprIn = useStateMachineInput(rive, 'FaceSM', 'expression');
  useEffect(() => { if (stateIn) stateIn.value = p.state; if (mouthIn) mouthIn.value = p.mouth;
                    if (gazeIn) gazeIn.value = p.gaze; if (exprIn) exprIn.value = p.expression; }, [stateIn, mouthIn, gazeIn, exprIn, p]);
  useEffect(() => {            // reduced motion: not handled by Rive
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const apply = () => { if (rive) (mq.matches ? rive.pause() : rive.play()); };
    apply(); mq.addEventListener('change', apply); return () => mq.removeEventListener('change', apply);
  }, [rive]);
  return <RiveComponent style={{ width: '100%', height: '100%' }} />;
}
// Data-binding path (preferred for a new .riv): const vm = useViewModel(rive, { useDefault: true });
// const vmi = useViewModelInstance(vm, { useDefault: true, rive }); const { setValue: setMouth } = useViewModelInstanceNumber('mouth', vmi);
```
---

## 2. `@mediapipe/tasks-vision` 1.0.1

- Install: `npm i @mediapipe/tasks-vision`. No deps/peers. `types: vision.d.ts`; ESM `vision_bundle.mjs` (155 KB). (`<NM>/@mediapipe/tasks-vision/package.json`)
- Shipped WASM (`<NM>/@mediapipe/tasks-vision/wasm/`): `vision_wasm_internal.js` (323 KB) + `.wasm` (11.76 MB), `vision_wasm_nosimd_internal.*` (10.96 MB), `vision_wasm_module_internal.*` (ES-module loader). **No `.task`/`.tflite` model ships in the package** (`find` found none); README uses `https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task`.

### API (`<NM>/@mediapipe/tasks-vision/vision.d.ts`)
```ts
export declare class FilesetResolver {
  static isSimdSupported(useModule?: boolean): Promise<boolean>;
  static forVisionTasks(basePath?: string, useModule?: boolean): Promise<WasmFileset>;  // basePath: directory the Wasm files load from (default: host root)
}
declare interface WasmFileset { wasmLoaderPath: string; wasmBinaryPath: string; assetLoaderPath?: string; assetBinaryPath?: string; }
declare interface BaseOptions { modelAssetPath?: string | undefined; modelAssetBuffer?: Uint8Array | ReadableStreamDefaultReader | undefined; delegate?: "CPU" | "GPU" | undefined; }
declare interface VisionTaskOptions extends TaskRunnerOptions /* { baseOptions?: BaseOptions } */ {
  canvas?: HTMLCanvasElement | OffscreenCanvas;   // "has to be set for GPU processing"
  runningMode?: RunningMode;                       // declare type RunningMode = "IMAGE" | "VIDEO";  default image mode
}
export declare interface FaceLandmarkerOptions extends VisionTaskOptions {
  numFaces?: number | undefined;                   // Defaults to 1.
  minFaceDetectionConfidence?: number | undefined; minFacePresenceConfidence?: number | undefined; minTrackingConfidence?: number | undefined; // 0.5 each
  outputFaceBlendshapes?: boolean | undefined; outputFacialTransformationMatrixes?: boolean | undefined;
}
export declare class FaceLandmarker extends VisionTaskRunner {
  static createFromOptions(wasmFileset: WasmFileset, faceLandmarkerOptions: FaceLandmarkerOptions): Promise<FaceLandmarker>;
  static createFromModelPath(wasmFileset: WasmFileset, modelAssetPath: string): Promise<FaceLandmarker>;
  static createFromModelBuffer(wasmFileset: WasmFileset, modelAssetBuffer: Uint8Array | ReadableStreamDefaultReader): Promise<FaceLandmarker>;
  setOptions(options: FaceLandmarkerOptions): Promise<void>;
  detect(image: ImageSource, imageProcessingOptions?: ImageProcessingOptions): FaceLandmarkerResult;
  detectForVideo(videoFrame: ImageSource, timestamp: number, imageProcessingOptions?: ImageProcessingOptions): FaceLandmarkerResult; // timestamp "in ms"
  close(): void;   // inherited: "Closes and cleans up the resources held by this task."
}
export declare interface FaceLandmarkerResult { faceLandmarks: NormalizedLandmark[][]; faceBlendshapes: Classifications[]; facialTransformationMatrixes: Matrix[]; }
export declare interface NormalizedLandmark { x: number; y: number; z: number; visibility: number; }
export declare interface Classifications { categories: Category[]; headIndex: number; headName: string; }
export declare interface Category { score: number; index: number; categoryName: string; displayName: string; }
export declare interface Matrix { rows: number; columns: number; data: number[]; }   // "values as a flattened one-dimensional array"
declare interface ImageProcessingOptions { regionOfInterest?: RectF; rotationDegrees?: number; }
export declare type ImageSource = TexImageSource;   // @deprecated alias
```
### Gotchas
1. **Assets resolve at runtime, not via your bundler.** `forVisionTasks(basePath)` computes `` `${basePath}/vision_wasm${module?'_module':''}${simd?'':'_nosimd'}_internal.js` `` + `.wasm` (minified `oh()` in `vision_bundle.mjs`). Copy the whole `wasm/` folder to `public/mediapipe/wasm/` **without renaming** (d.ts: filesets "require that the Wasm files are published without renaming"), or use the README CDN path `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm` (pin `@1.0.1`).
2. **Self-host the model too**: download `face_landmarker.task` next to the wasm so the only network traffic is to your origin. `modelAssetPath` is fetched with `fetch()` (bundle).
3. **Size**: ~12 MB (wasm + loader) + 155 KB bundle + model (size NOT CONFIRMED FROM PACKAGE FILES). Load lazily via `await import('@mediapipe/tasks-vision')` in a client component after consent; never in the initial bundle.
4. **Delegate default is CPU**: the bundle sets the GPU acceleration proto only when `e.delegate === "GPU"`, else CPU. GPU also needs `canvas` (WebGL2 context; throws if it cannot create one). At 5–10 fps CPU is fine.
5. **Timestamps**: `detectForVideo` is synchronous. A strictly-increasing-timestamp requirement is NOT CONFIRMED FROM PACKAGE FILES (d.ts only says "timestamp of the current frame, in ms") — use `performance.now()` and never reuse a value. Skip frames while `video.readyState < 2`.
6. **Blendshape names (`eyeBlinkLeft` …) come from the model, not the package** (0 grep hits in the bundle): NOT CONFIRMED FROM PACKAGE FILES. Look them up by `categoryName` defensively. Matrix is `{rows:4, columns:4, data[16]}`; row/column-major order NOT CONFIRMED — validate yaw/pitch signs with a live face.
7. **Privacy notice (README)**: frames stay on device, but "MediaPipe Tasks APIs send metrics about the performance and utilization of the APIs in your app to Google" and you must obtain consent where required. An opt-out flag is NOT CONFIRMED FROM PACKAGE FILES. Call `close()` when the session ends.

### Snippet
```ts
'use client';
import type { FaceLandmarker, FaceLandmarkerResult } from '@mediapipe/tasks-vision';
let lm: FaceLandmarker | null = null;
export async function initFace() {
  const { FilesetResolver, FaceLandmarker } = await import('@mediapipe/tasks-vision');
  const fileset = await FilesetResolver.forVisionTasks('/mediapipe/wasm');           // copied from node_modules/@mediapipe/tasks-vision/wasm
  lm = await FaceLandmarker.createFromOptions(fileset, {
    baseOptions: { modelAssetPath: '/mediapipe/face_landmarker.task', delegate: 'CPU' },
    runningMode: 'VIDEO', numFaces: 1, outputFaceBlendshapes: true, outputFacialTransformationMatrixes: true,
  });
}
export function sampleFace(video: HTMLVideoElement) {          // call from setInterval(…, 125) => 8 fps
  if (!lm || video.readyState < 2) return null;
  const r: FaceLandmarkerResult = lm.detectForVideo(video, performance.now());
  const cats = r.faceBlendshapes[0]?.categories ?? [];
  const s = (n: string) => cats.find((c) => c.categoryName === n)?.score ?? 0;
  return { eyesOpen: 1 - (s('eyeBlinkLeft') + s('eyeBlinkRight')) / 2, matrix: r.facialTransformationMatrixes[0]?.data ?? null };
}
export function stopFace() { lm?.close(); lm = null; }
```
---

## 3. `@ricky0123/vad-web` 0.0.30

- Install: `npm i @ricky0123/vad-web` (dependency `onnxruntime-web ^1.17.0`, installed 1.29.0; no peers). `main: dist/index.js` (CJS); UMD `dist/bundle.min.js` exposes global `vad`. Types: `dist/index.d.ts` (no `types` field in package.json, but resolved alongside `index.js`).
- Shipped assets (`<NM>/@ricky0123/vad-web/dist/`): `silero_vad_v5.onnx` (2.33 MB), `silero_vad_legacy.onnx` (1.81 MB), `vad.worklet.bundle.min.js` (2.5 KB).

### API (`<NM>/@ricky0123/vad-web/dist/real-time-vad.d.ts`, `frame-processor.d.ts`, `utils.d.ts`, `models/common.d.ts`)
```ts
export interface FrameProcessorOptions { positiveSpeechThreshold: number; negativeSpeechThreshold: number; redemptionMs: number;
  preSpeechPadMs: number; minSpeechMs: number; submitUserSpeechOnPause: boolean; }
interface RealTimeVADCallbacks {
  onFrameProcessed: (probabilities: SpeechProbabilities, frame: Float32Array) => Promise<void> | void;
  onVADMisfire: () => Promise<void> | void;
  onSpeechStart: () => Promise<void> | void;
  onSpeechEnd: (audio: Float32Array) => Promise<void> | void;   // "Float32Array of audio samples between -1 and 1, sample rate 16000"
  onSpeechRealStart: () => Promise<void> | void;                 // "when speech is detected as valid (i.e. not a misfire)"
}
type AssetOptions = { workletOptions: AudioWorkletNodeOptions; baseAssetPath: string; onnxWASMBasePath: string; };
type ModelOptions = { model: "v5" | "legacy"; };
export interface RealTimeVADOptions extends FrameProcessorOptions, RealTimeVADCallbacks, OrtOptions /* { ortConfig?: (ort) => void } */, AssetOptions, ModelOptions {
  audioContext?: AudioContext;
  getStream: () => Promise<MediaStream>; pauseStream: (stream: MediaStream) => Promise<void>; resumeStream: (stream: MediaStream) => Promise<MediaStream>;
  startOnLoad: boolean; processorType: "AudioWorklet" | "ScriptProcessor" | "auto";
}
export interface SpeechProbabilities { notSpeech: number; isSpeech: number; }
export declare class MicVAD {
  options: RealTimeVADOptions; listening: boolean; errored: string | null;
  static new(options?: Partial<RealTimeVADOptions>): Promise<MicVAD>;
  start: () => Promise<void>;  pause: () => Promise<void>;  destroy: () => Promise<void>;
  setOptions: (update: Partial<FrameProcessorOptions>) => void;
}
export declare function encodeWAV(samples: Float32Array, format?: number, sampleRate?: number, numChannels?: number, bitDepth?: number): ArrayBuffer;
export declare const utils: { audioFileToArray; minFramesForTargetMS; arrayBufferToBase64; encodeWAV: typeof encodeWAV };
```
Defaults (`dist/frame-processor.js`, `dist/real-time-vad.js`, `dist/utils.js`): `positiveSpeechThreshold 0.3`, `negativeSpeechThreshold 0.25`, `preSpeechPadMs 800`, `redemptionMs 1400`, `minSpeechMs 400`, `submitUserSpeechOnPause false`, `baseAssetPath "./"`, `onnxWASMBasePath "./"`, `model "legacy"`, `startOnLoad true`, `processorType "auto"`, `getStream = getUserMedia({audio:{channelCount:1, echoCancellation:true, autoGainControl:true, noiseSuppression:true}})`, `ortConfig = ort => { ort.env.logLevel = "error" }`; `encodeWAV(samples, format = 3, sampleRate = 16000, numChannels = 1, bitDepth = 32)` (format 1 → 16-bit PCM path).

### Gotchas
1. **Option names differ from older docs**: `redemptionMs`/`preSpeechPadMs`/`minSpeechMs` (ms). `redemptionFrames` etc. are derived (`Math.floor(redemptionMs / msPerFrame)`) on `FrameProcessor`, not options. There is **no `stream` option**: pass `getStream` (and `pauseStream`/`resumeStream` if you own the stream — defaults stop the tracks on `pause()` and call `getUserMedia` again on resume).
2. **Assets you must serve** (paths are plain string concatenation, so end them with `/`): from `baseAssetPath`: `vad.worklet.bundle.min.js` + `silero_vad_v5.onnx` (or `_legacy`); from `onnxWASMBasePath` (assigned to `ort.env.wasm.wasmPaths` in `MicVAD.new`): onnxruntime-web 1.29.0's `dist/ort-wasm-simd-threaded.{mjs,wasm}` (14 MB; sibling `.jsep/.asyncify/.jspi` variants exist — which one ORT picks is NOT CONFIRMED FROM PACKAGE FILES; copy the whole `ort-wasm-simd-threaded.*` set). Copy to `public/vad/` in a prebuild script.
3. **Barge-in latency**: `onSpeechStart` fires on the **first** frame with `isSpeech >= positiveSpeechThreshold` (`frame-processor.js` `process()`: `if (isSpeech && !this.speaking) { speaking = true; SpeechStart }`) — no debounce. Frame = `model === "v5" ? 512 : 1536` samples (`msPerFrame = frameSamples / 16` → **32 ms for v5, 96 ms for legacy**). Use `model: 'v5'` to stay under ~100 ms including inference; the default legacy model alone costs 96 ms/frame. Confirm with `onSpeechRealStart` (after `minSpeechMs`), roll back on `onVADMisfire`. `onSpeechEnd` waits `redemptionMs` of silence (1400 ms default — lower it).
4. **Audio graph**: `start()` creates an `AudioContext` (needs a user gesture; or pass `audioContext`) and loads the worklet via `audioContext.audioWorklet.addModule(baseAssetPath + "vad.worklet.bundle.min.js")`; the worklet resamples to 16 kHz. `startOnLoad: true` means `MicVAD.new()` already requests the mic — set `false` to control when permission is asked.
5. **Client-only**: `dist/index.js` imports `onnxruntime-web/wasm` at load; `asset-path.js` guards `window` for SSR but still `await import()` it inside an effect.
6. `destroy()` posts `SpeechStop` to the worklet, pauses, releases the ONNX session, and closes the AudioContext only if it created it. `pause()` keeps the model warm.

### Snippet
```ts
'use client';
import type { MicVAD } from '@ricky0123/vad-web';
export async function startVad(onBargeIn: () => void, onUtterance: (wav: ArrayBuffer) => void): Promise<MicVAD> {
  const { MicVAD, utils } = await import('@ricky0123/vad-web');
  const vad = await MicVAD.new({
    model: 'v5', baseAssetPath: '/vad/', onnxWASMBasePath: '/vad/', startOnLoad: false,
    positiveSpeechThreshold: 0.5, negativeSpeechThreshold: 0.35, minSpeechMs: 250, redemptionMs: 600, preSpeechPadMs: 300,
    onSpeechStart: () => onBargeIn(),
    onVADMisfire: () => { /* resume TTS */ },
    onSpeechEnd: (audio) => onUtterance(utils.encodeWAV(audio, 1, 16000, 1, 16)),   // 16-bit PCM WAV
  });
  await vad.start();                     // after a user gesture
  return vad;                            // later: await vad.pause(); await vad.destroy();
}
```
---

## 4. `@clerk/nextjs` 7.9.1 (+ `@clerk/backend` 3.17.1, `@clerk/shared` 4.31.0)

- Install: `npm i @clerk/nextjs`. Node `>=20.9.0`. Peers: `next ^15.2.8 || … || ^16.0.10 || ^16.1.0-0`, `react`/`react-dom` `^18.0.0 || ~19.0.3 || ~19.1.4 || ~19.2.3 || ~19.3.0-0`. Exports: `.`, `./server`, `./errors`, `./webhooks`, `./types`, `./experimental`, `./legacy`. (`<NM>/@clerk/nextjs/package.json`)

### Server API (`<NM>/@clerk/nextjs/dist/types/server/index.d.ts` and files it re-exports)
```ts
export { verifyToken, createClerkClient } from '@clerk/backend';
export { clerkClient } from './clerkClient';        // declare const clerkClient: () => Promise<ClerkClient>;
export { auth } from '../app-router/server/auth';   // declare const auth: AuthFn  — async; "Requires clerkMiddleware() to be configured"
export { currentUser } from '../app-router/server/currentUser';  // declare function currentUser(opts?): Promise<User | null>;
export { clerkMiddleware } from './clerkMiddleware';
// server/clerkMiddleware.d.ts
interface ClerkMiddleware {
  (handler: ClerkMiddlewareHandler, options?: ClerkMiddlewareOptions): NextMiddleware;
  (handler: ClerkMiddlewareHandler, options?: ClerkMiddlewareOptionsCallback): NextMiddleware;
  (options?: ClerkMiddlewareOptions): NextMiddleware;
  (request: NextMiddlewareRequestParam, event: NextMiddlewareEvtParam): NextMiddlewareReturn;
}
type ClerkMiddlewareHandler = (auth: ClerkMiddlewareAuth, request: NextMiddlewareRequestParam, event: NextMiddlewareEvtParam) => NextMiddlewareReturn;
export interface ClerkMiddlewareOptions extends AuthenticateAnyRequestOptions { debug?: boolean; contentSecurityPolicy?: ContentSecurityPolicyOptions; frontendApiProxy?: FrontendApiProxyOptions; }
// app-router/server/auth.d.ts: AuthFn = GetAuthFnNoRequest<SessionAuthWithRedirect, true> & { protect: AuthProtect }
//   overloads (@clerk/backend/dist/tokens/types.d.ts): auth(options?: PendingSessionOptions): Promise<SessionAuthWithRedirect>
//                                                     auth({ acceptsToken: 'any' | TokenType | TokenType[] }): Promise<...machine/session union>
// @clerk/backend/dist/index.d.ts
export declare const verifyToken: (token: string, options: { audience?; authorizedParties?: string[]; clockSkewInMs?; secretKey?; apiUrl?; apiVersion?; skipJwksCache?; jwksCacheTtlInMs?; jwtKey?: string; }) => Promise<JwtPayload>;
export declare function createClerkClient(options: ClerkOptions): ClerkClient;   // ClerkClient = ApiClient & { authenticateRequest, telemetry }
// @clerk/backend/dist/tokens/request.d.ts
export interface AuthenticateRequest { (request: Request, options?: AuthenticateRequestOptions): Promise<RequestState<SessionTokenType>>; /* + acceptsToken overloads */ }
// RequestState (tokens/authStatus.d.ts): { status: 'signed-in' | 'signed-out' | 'handshake'; isAuthenticated: boolean; token: string | null; headers: Headers; reason; message; toAuth: () => SignedInAuthObject | SignedOutAuthObject | null }
```
Auth object (`@clerk/backend/dist/tokens/authObjects.d.ts` + `@clerk/shared/dist/types/authObject.d.ts`):
```ts
SignedInAuthObject: { sessionClaims: JwtPayload; sessionId: string; sessionStatus; actor; userId: string; orgId: string | undefined;
  orgRole: OrganizationCustomRoleKey | undefined; orgSlug: string | undefined; orgPermissions: OrganizationCustomPermissionKey[] | undefined;
  factorVerificationAge; tokenType: 'session_token'; getToken: ServerGetToken; has: CheckAuthorizationFromSessionClaims; debug; isAuthenticated: true }
SignedOutAuthObject: { userId: null; sessionId: null; sessionClaims: null; orgId: null; orgRole: null; orgSlug: null; orgPermissions: null; ...; isAuthenticated: false }
```
Custom claims (`<NM>/@clerk/shared/dist/types/jwtv2.d.ts`):
```ts
declare global { /** redeclare this interface in the global namespace and provide your own custom keys */ interface CustomJwtSessionClaims { [k: string]: unknown; } }
type JWTPayloadBase = { __raw: string; iss: string; sub: string; sid: string; nbf: number; exp: number; iat: number; azp?: string; act?: ActClaim; fva?: [number, number]; sts?: SessionStatusClaim; [propName: string]: unknown; };
// v1 payloads add org_id?, org_slug?, org_role?, org_permissions?;  v2 payloads ({ v: 2 }) nest them under o?: { id; slg?; ... } plus fea?/pla?
```
Client (`<NM>/@clerk/nextjs/dist/types/index.d.ts`, `types.d.ts`, `client-boundary/uiComponents.d.ts`):
```ts
export declare const ClerkProvider: ...;   // props: NextClerkProviderProps = Without<ClerkProviderProps, 'publishableKey'> & { publishableKey?: string; dynamic?: boolean /* default false */ }
export declare const SignIn: (props: ComponentProps<typeof BaseSignIn>) => React.JSX.Element;  // SignInProps: forceRedirectUrl?, fallbackRedirectUrl?, signUpUrl?, appearance?, initialValues?, withSignUp?, oauthFlow?: 'auto'|'redirect'|'popup' (…/shared/dist/types/clerk.d.ts:1597+)
export declare const auth: never;   // doc: "import { auth } from '@clerk/nextjs/server'"
```
### Gotchas
1. Server helpers only from `@clerk/nextjs/server`; the root export types `auth` as `never`. `auth()` returns a Promise (`ReturnsPromise = true`): `const { userId, orgId, sessionClaims } = await auth()`.
2. **Next 16 file convention**: peer range includes 16, but the package never mentions `proxy.ts` (grep: none) — whether `clerkMiddleware()` exported from Next 16's `proxy.ts` works is NOT CONFIRMED FROM PACKAGE FILES; it returns a plain `NextMiddleware`, so it should be file-name agnostic — verify at runtime. The `matcher` config is also NOT CONFIRMED FROM PACKAGE FILES (take it from Clerk's quickstart).
3. `createRouteMatcher` is `@deprecated`: "Move auth checks into each page, layout, API route, or Server Function that accesses protected data. Middleware-based auth checks rely on path matching, which can diverge from how Next.js routes requests". Check `userId` inside every route handler.
4. `auth.protect()` returns **404** to unauthenticated non-document (API) requests (auth.d.ts table) — for JSON APIs do an explicit 401.
5. `currentUser()` calls Backend API `GET /v1/users/{user_id}` (fetch-deduped per request, rate-limited); `auth()` is JWT-only. Use `auth()` for identity on every route; `currentUser()` only for profile fields.
6. Org/custom claims: `orgId/orgRole/orgSlug/orgPermissions` are on the auth object; other custom claims must be added to the session token in the Clerk Dashboard (NOT CONFIRMED FROM PACKAGE FILES) and typed via `CustomJwtSessionClaims` augmentation.
7. Header-token verification: `verifyToken(token, { jwtKey: process.env.CLERK_JWT_KEY, authorizedParties: [...] })` is networkless with `jwtKey` (else JWKS fetch). `tokens/verify.d.ts` warns it is "lower-level … recommended to use authenticateRequest()" (via `createClerkClient({secretKey}).authenticateRequest(request)`).

### Snippet
```ts
// middleware.ts (Next 16: see gotcha 2)
import { clerkMiddleware } from '@clerk/nextjs/server';
export default clerkMiddleware();
// app/api/turn/route.ts
import { auth } from '@clerk/nextjs/server';
declare global { interface CustomJwtSessionClaims { plan?: 'free' | 'pro' } }
export async function POST() {
  const { userId, orgId, sessionClaims } = await auth();
  if (!userId) return Response.json({ error: 'unauthorized' }, { status: 401 });
  return Response.json({ userId, orgId: orgId ?? null, plan: sessionClaims.plan ?? 'free' });
}
// app/layout.tsx: import { ClerkProvider } from '@clerk/nextjs'; wrap <html> in <ClerkProvider>…</ClerkProvider>
// app/sign-in/[[...sign-in]]/page.tsx: import { SignIn } from '@clerk/nextjs'; export default () => <SignIn />;
```
---

## 5. `stripe` 22.6.1

- Install: `npm i stripe`. Node `>=18`; optional peer `@types/node >=18`; no deps. Types live in `esm/**/*.d.ts` (no `types/` folder). Library-pinned `ApiVersion = "2026-08-26.dahlia"` (`<NM>/stripe/esm/apiVersion.d.ts`). Export conditions: `worker|workerd|browser|bun|deno` → fetch-based `stripe.esm.worker.js`; everything else (incl. Next's `edge-light`, which is absent) → Node build.

### API (`<NM>/stripe/esm/stripe.esm.node.d.ts`, `lib.d.ts`, `Webhooks.d.ts`, `resources/**`)
```ts
export declare class Stripe { constructor(key: string, config?: StripeConfig); webhooks: ReturnType<typeof createWebhooks>;
  checkout: Checkout; billingPortal: BillingPortal; billing: Billing; subscriptions: SubscriptionResource; customers: CustomerResource; invoices: InvoiceResource; }
export declare namespace Stripe { export { Event, EventBase }; export { Checkout }; export { Billing }; export { BillingPortal };
  export { CustomerSubscriptionDeletedEvent, InvoicePaymentFailedEvent, CheckoutSessionCompletedEvent, /* … one interface per event type */ }; }
export interface StripeConfig { apiVersion?: LatestApiVersion; typescript?: true; maxNetworkRetries?: number /* default 1 */; httpClient?: HttpClientInterface;
  timeout?: number /* default 80000 */; telemetry?: boolean; appInfo?: AppInfo; stripeAccount?: string; stripeContext?: string | StripeContext; }
export type Response<T> = T & { lastResponse: { headers: { [key: string]: string }; requestId: string; statusCode: number; /* … */ } };   // lib.d.ts
export interface RequestOptions { apiKey?: string; idempotencyKey?: string; stripeAccount?: string; /* … */ }                                 // lib.d.ts
// Webhooks.d.ts
constructEvent: (payload: WebhookPayload, header: WebhookHeader, secret: string, tolerance?: number, cryptoProvider?: CryptoProvider, receivedAt?: number) => Event;
constructEventAsync: (payload: WebhookPayload, header: WebhookHeader, secret: string, tolerance?: number, cryptoProvider?: CryptoProvider, receivedAt?: number) => Promise<Event>;
export type WebhookPayload = string | Uint8Array;  export type WebhookHeader = string | string[] | Uint8Array;
// resources/Checkout/Sessions.d.ts
create(params?: Checkout.SessionCreateParams, options?: RequestOptions): Promise<Response<Session>>;
interface SessionCreateParams { mode?: 'payment' | 'setup' | 'subscription' /* "Pass `subscription` if the Checkout Session includes at least one recurring item." */;
  line_items?: Array<{ price?: string; quantity?: number; price_data?; adjustable_quantity?; metadata? }>;
  success_url?: string; cancel_url?: string; return_url?: string; ui_mode?: 'elements' | 'embedded_page' | 'form' | 'hosted_page';
  customer?: string; customer_email?: string; client_reference_id?: string; metadata?: MetadataParam; allow_promotion_codes?: boolean;
  subscription_data?: { trial_period_days?: number; trial_settings?; metadata?: MetadataParam; description?: string; billing_cycle_anchor?: number; proration_behavior? };
  automatic_tax?; billing_address_collection?; customer_update?; payment_method_collection?; tax_id_collection?; expires_at?: number; locale?; }
export interface Session { id: string; object: 'checkout.session'; mode; status: 'complete' | 'expired' | 'open' | OtherString | null; payment_status: 'no_payment_required' | 'paid' | 'unpaid' | OtherString;
  customer: string | Customer | DeletedCustomer | null; customer_email: string | null; client_reference_id: string | null; subscription: string | Subscription | null; metadata: Metadata | null; url: string | null; expires_at: number; }
// resources/BillingPortal/Sessions.d.ts
create(params?: BillingPortal.SessionCreateParams, options?: RequestOptions): Promise<Response<Session>>;
interface SessionCreateParams { customer?: string; return_url?: string; configuration?: string; flow_data?; locale?; on_behalf_of?: string; customer_account?: string; }
export interface Session { url: string /* "short-lived URL … gives customers access to the customer portal" */; customer: string; return_url: string | null; /* … */ }
// resources/Billing/MeterEvents.d.ts
create(params: Billing.MeterEventCreateParams, options?: RequestOptions): Promise<Response<MeterEvent>>;
interface MeterEventCreateParams { event_name: string; payload: { [key: string]: string }; identifier?: string; timestamp?: number; expand?: Array<string>; }
export interface MeterEvent { object: 'billing.meter_event'; created: number; event_name: string; identifier: string; livemode: boolean; payload: { [key: string]: string }; timestamp: number; }
// resources/Subscriptions.d.ts
retrieve(id: string, params?: SubscriptionRetrieveParams, options?: RequestOptions): Promise<Response<Subscription>>;
update(id: string, params?: SubscriptionUpdateParams, options?: RequestOptions): Promise<Response<Subscription>>;
cancel(id: string, params?: SubscriptionCancelParams, options?: RequestOptions): Promise<Response<Subscription>>;
export interface Subscription { status: 'active' | 'canceled' | 'incomplete' | 'incomplete_expired' | 'past_due' | 'paused' | 'trialing' | 'unpaid' | OtherString;
  cancel_at_period_end: boolean; customer: string | Customer | DeletedCustomer; items: ApiList<SubscriptionItem>; latest_invoice: string | Invoice | null; metadata: Metadata; trial_end: number | null; }
export interface SubscriptionUpdateParams { cancel_at_period_end?: boolean; cancellation_details?; proration_behavior?; trial_end?: 'now' | number; metadata?: Emptyable<MetadataParam>; }
export interface SubscriptionCancelParams { cancellation_details?; invoice_now?: boolean; prorate?: boolean; }
// resources/SubscriptionItems.d.ts:  current_period_end: number;  current_period_start: number;     <-- on the ITEM
// resources/Events.d.ts
export type Event = AccountApplicationAuthorizedEvent | … | CustomerSubscriptionDeletedEvent | … | InvoicePaymentFailedEvent | …;   // discriminated union on `type`
export interface CustomerSubscriptionDeletedEvent extends EventBase { type: 'customer.subscription.deleted'; data: { object: Subscription; previous_attributes?: Partial<Subscription> }; }
export interface InvoicePaymentFailedEvent extends EventBase { type: 'invoice.payment_failed'; data: { object: Invoice; previous_attributes?: Partial<Invoice> }; }
export interface CheckoutSessionCompletedEvent extends EventBase { type: 'checkout.session.completed'; data: { object: Checkout.Session; previous_attributes?: Partial<Checkout.Session> }; }
```
### Gotchas
1. **Webhook route needs the raw body**: `constructEvent(await req.text(), req.headers.get('stripe-signature')!, secret)`; keep the route on the Node runtime (the exports map has no `edge-light` condition, so the edge runtime would get the Node build). `Stripe.Event` is a true union — `switch (event.type)` narrows `event.data.object`.
2. `current_period_end/start` are **not on `Subscription`** in this API version; read `sub.items.data[0].current_period_end` (`SubscriptionItems.d.ts`).
3. Meter events: `payload` values are **strings** (`{ stripe_customer_id, value: String(minutes) }`); `identifier` = your UUID for idempotency ("uniqueness within a rolling period of at least 24 hours"); `timestamp` must be within the past 35 days / +5 min. The meter (`event_name`, `customer_mapping`, `value_settings`) is created separately (`resources/Billing/Meters.d.ts`).
4. Types track the newest API version only; enums are open (`| OtherString`) so always add a default branch. Instantiate lazily or with a placeholder key so `next build` does not throw (README warning).
5. `Response<T>` carries `lastResponse.requestId`; pass `{ idempotencyKey }` (RequestOptions) on Checkout-session creation; `maxNetworkRetries` default 1.

### Snippet
```ts
import Stripe from 'stripe';
let _s: Stripe | null = null;
export const stripe = () => (_s ??= new Stripe(process.env.STRIPE_SECRET_KEY as string, { typescript: true, maxNetworkRetries: 2 }));

export async function checkoutUrl(customer: string, price: string, userId: string) {
  const s = await stripe().checkout.sessions.create({
    mode: 'subscription', customer, line_items: [{ price, quantity: 1 }],
    success_url: `${process.env.APP_URL}/billing?ok=1`, cancel_url: `${process.env.APP_URL}/billing`,
    client_reference_id: userId, metadata: { userId }, subscription_data: { metadata: { userId } }, allow_promotion_codes: true,
  }, { idempotencyKey: `checkout:${userId}:${price}` });
  return s.url;
}
export const portalUrl = async (customer: string) => (await stripe().billingPortal.sessions.create({ customer, return_url: `${process.env.APP_URL}/billing` })).url;
export const meterMinutes = (customer: string, minutes: number, identifier: string) =>
  stripe().billing.meterEvents.create({ event_name: 'tutor_minutes', payload: { stripe_customer_id: customer, value: String(minutes) }, identifier });

export async function POST(req: Request) {   // app/api/stripe/webhook/route.ts (Node runtime)
  const event = stripe().webhooks.constructEvent(await req.text(), req.headers.get('stripe-signature') ?? '', process.env.STRIPE_WEBHOOK_SECRET as string);
  switch (event.type) {
    case 'customer.subscription.deleted': { const sub = event.data.object; /* sub: Stripe.Subscription */ break; }
    case 'invoice.payment_failed':        { const inv = event.data.object; /* inv: Stripe.Invoice */ break; }
    default: break;
  }
  return new Response('ok');
}
```
---

## 6. `posthog-js` 1.426.2 and `posthog-node` 5.51.6

- Install: `npm i posthog-js posthog-node`. `posthog-js`: optional peers `react`/`@types/react >=16.8.0`; deps `@posthog/types`, `@posthog/core`, `@posthog/browser-common`, preact, dompurify, fflate, web-vitals. `posthog-node`: Node `^20.20.0 || >=22.22.0`; optional peer `rxjs`; export conditions `edge`/`edge-light`/`workerd` → `index.edge.js`.

### Browser (`<NM>/posthog-js/dist/module.d.ts`; config in `<NM>/@posthog/types/dist/posthog-config.d.ts`)
```ts
declare class PostHog {
  init(token: string, config?: OnlyValidKeys<Partial<PostHogConfig>, Partial<PostHogConfig>>, name?: string): PostHog;
  capture(event_name: EventName, properties?: Properties | null, options?: CaptureOptions): CaptureResult | undefined;
  identify(new_distinct_id: string, userPropertiesToSet?: Properties, userPropertiesToSetOnce?: Properties): void;
  reset(options?: boolean | ResetOptions): void;          // ResetOptions { resetDeviceID?: boolean; bootstrap?: BootstrapConfig }
  set_config(config: Partial<PostHogConfig>): void;  opt_in_capturing(options?): void;  opt_out_capturing(): void;  has_opted_out_capturing(): boolean;
}
declare const posthog: PostHog;  export { PostHog, posthog as default, posthog };
export interface PostHogConfig {
  api_host: string;                                              // @default 'https://us.i.posthog.com'
  ui_host: string | null;                                        // set to the real app URL when api_host is a reverse proxy
  autocapture: boolean | AutocaptureConfig;                      // @default true
  capture_pageview: boolean | 'history_change' | CapturePageviewOptions;   // @default true ('history_change' when defaults >= '2025-05-24')
  capture_pageleave: boolean | 'if_capture_pageview';            // @default 'if_capture_pageview'
  disable_session_recording: boolean;                            // @default false
  disable_surveys: boolean;                                      // @default false
  disable_external_dependency_loading: boolean;                  // @default false — "prevent PostHog from requesting any external scripts such as those needed for Session Replay, Surveys or Site Apps"
  persistence: 'localStorage' | 'cookie' | 'memory' | 'localStorage+cookie' | 'sessionStorage';   // @default 'localStorage+cookie'
  disable_persistence: boolean;                                  // @default false
  person_profiles?: 'always' | 'never' | 'identified_only';      // @default 'identified_only'
  capture_heatmaps?: boolean | HeatmapConfig; capture_dead_clicks?: boolean | ...; capture_exceptions?: boolean | ...; capture_performance?: boolean | ...; rageclick: boolean | RageclickConfig;
  opt_out_capturing_by_default: boolean; respect_dnt: boolean; property_denylist: string[]; sanitize_properties: ((properties: Properties, event_name: string) => Properties) | null;
  before_send?: BeforeSendFn | BeforeSendFn[]; mask_all_text: boolean; mask_all_element_attributes: boolean; defaults: ConfigDefaults; loaded: (posthog_instance: PostHog) => void;
}
```
### Server (`<NM>/posthog-node/dist/client.d.ts`, `types.d.ts`, `<NM>/@posthog/core/dist/posthog-core-stateless.d.ts`, `types.d.ts`)
```ts
export declare class PostHog extends PostHogBackendClient {}   // entrypoints/index.node.d.ts
constructor(apiKey: string, options?: PostHogOptions);
capture(props: EventMessage): void;   captureImmediate(props: EventMessage): Promise<void>;
identify({ distinctId, properties, disableGeoip }: IdentifyMessage): void;
flush(): Promise<void>;   shutdown(shutdownTimeoutMs?: number): Promise<void>;   // [shutdownTimeoutMs=30000]
export type EventMessage = { distinctId?: string; event: string; properties?: Record<string | number, any>; groups?: Record<string, string | number>;
  timestamp?: Date; uuid?: string; disableGeoip?: boolean; flags?: FeatureFlagEvaluations; /** @deprecated */ sendFeatureFlags?: … };
// PostHogOptions = Omit<PostHogCoreOptions,…> & { persistence?: 'memory'; flushInterval?: number /* 5000 */; maxQueueSize?: number /* 10000 */; secretKey?; privacyMode?: boolean; enableExceptionAutocapture?: boolean; … }
// PostHogCoreOptions: host?: string /* 'https://us.i.posthog.com' */; flushAt?: number /* 20 */; maxBatchSize?: number /* 100 */; disabled?: boolean; defaultOptIn?: boolean /* true */; …
```
### Gotchas
1. Privacy-minimal browser init = `disable_session_recording: true, disable_surveys: true, disable_external_dependency_loading: true, autocapture: false, capture_pageview: false | 'history_change', capture_pageleave: false, capture_heatmaps: false, capture_dead_clicks: false, capture_exceptions: false, rageclick: false, capture_performance: false, person_profiles: 'identified_only'`. `disable_external_dependency_loading` is the hard guarantee that the recorder/surveys bundles are never fetched.
2. `capture_pageview` silently becomes `'history_change'` if you set `defaults: '2025-05-24'` or later — set it explicitly. `ip` is a no-op ("Discard IP data" is a project setting).
3. `posthog-js` is browser-only: init in a `'use client'` provider inside `useEffect`; `identify(clerkUserId)` (never email), `reset()` on sign-out. `persistence: 'memory'` until consent, then `set_config({ persistence: 'localStorage+cookie' })`.
4. `posthog-node` batches (`flushAt` 20, `flushInterval` 5000 ms): on Vercel call `await ph.flush()` (or `captureImmediate`) before the response returns, and `shutdown()` on process exit. Server events need `distinctId`. Edge runtime is supported via the `edge-light` export.

### Snippet
```tsx
'use client';
import posthog from 'posthog-js';
import { useEffect } from 'react';
export function Analytics({ userId }: { userId?: string }) {
  useEffect(() => {
    posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY as string, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST, ui_host: 'https://us.posthog.com',
      disable_session_recording: true, disable_surveys: true, disable_external_dependency_loading: true,
      autocapture: false, capture_pageview: false, capture_pageleave: false, capture_heatmaps: false, capture_dead_clicks: false,
      capture_exceptions: false, rageclick: false, capture_performance: false, person_profiles: 'identified_only',
    });
  }, []);
  useEffect(() => { if (userId) posthog.identify(userId); else posthog.reset(); }, [userId]);
  return null;
}
// server
import { PostHog } from 'posthog-node';
const ph = new PostHog(process.env.POSTHOG_KEY as string, { host: process.env.POSTHOG_HOST, flushAt: 1, flushInterval: 0 });
export async function track(distinctId: string, event: string, properties?: Record<string, unknown>) { ph.capture({ distinctId, event, properties }); await ph.flush(); }
```
---

## 7. `@sentry/nextjs` 10.73.0

- Install: `npm i @sentry/nextjs`. Node `>=18`; peer `next ^13.2.0 || ^14.0 || ^15.0.0-rc.0 || ^16.0.0-0`. Exports: `.` (client/server/edge picked by condition), `./config` (`withSentryConfig`), `./import`, `./loader`. (`<NM>/@sentry/nextjs/package.json`)

### API
```ts
// build/types/index.types.d.ts
export declare function init(options: Options | clientSdk.BrowserOptions | serverSdk.NodeOptions | edgeSdk.EdgeOptions): Client | undefined;
/** @deprecated Import `withSentryConfig` from `@sentry/nextjs/config` instead. The `@sentry/nextjs` export is removed in v11. */
export declare const withSentryConfig: typeof configSdk.withSentryConfig;
export { captureRequestError } from './common/captureRequestError';
// build/types/config/withSentryConfig/index.d.ts
export declare function withSentryConfig<C>(nextConfig?: C, sentryBuildOptions?: SentryBuildOptions): C;
// build/types/config/types.d.ts SentryBuildOptions (subset): org?: string; project?: string | string[]; authToken?: string; silent?: boolean; debug?: boolean; telemetry?: boolean; sourcemaps?: {…}; release?: {…};
//   widenClientFileUpload?: boolean; tunnelRoute?: string | boolean; disableLogger?: boolean; automaticVercelMonitors?: boolean; reactComponentAnnotation?: {…}; bundleSizeOptimizations?: {…};
//   excludeServerRoutes?; autoInstrument{ServerFunctions,Middleware,AppDirectory}?; suppressOnRouterTransitionStartWarning?: boolean; useRunAfterProductionCompileHook?: boolean; webpack?: SentryBuildWebpackOptions;
// build/types/common/captureRequestError.d.ts
export declare function captureRequestError(error: unknown, request: { path: string; method: string; headers: Record<string, string | string[] | undefined> }, errorContext: { routerKind: string; routePath: string; routeType: string }): void;
// build/types/client/routing/appRouterRoutingInstrumentation.d.ts
export declare function captureRouterTransitionStart(href: string, navigationType: string): void;   // "handler for Next.js' `onRouterTransitionStart` hook in `instrumentation-client.ts`"
// @sentry/core/build/types/types/options.d.ts (ClientOptions/CoreOptions)
dsn?: string; enabled?: boolean /* true */; debug?: boolean; environment?: string /* "production" */; release?: string; tracesSampleRate?: number; enableLogs?: boolean /* true */;
ignoreErrors?: Array<string | RegExp>; tunnel?: string;
/** @deprecated Use dataCollection … removed in v11 … `sendDefaultPii: true` currently behaves like enabling all dataCollection categories */ sendDefaultPii?: boolean;  // @default false
dataCollection?: DataCollection;   // "control each category of collected data (user info, cookies, headers, query params, request/response bodies, gen AI inputs/outputs, etc.) individually"
beforeSend?: (event: ErrorEvent, hint: EventHint) => PromiseLike<ErrorEvent | null> | ErrorEvent | null;
beforeBreadcrumb?: (breadcrumb: Breadcrumb, hint?: BreadcrumbHint) => Breadcrumb | null;
defaultIntegrations?: false | Integration[];  integrations?: Integration[] | ((integrations: Integration[]) => Integration[]);   // Integration { name: string; … }
// @sentry/core/build/types/types/browseroptions.d.ts (part of BrowserOptions)
replaysSessionSampleRate?: number;   replaysOnErrorSampleRate?: number;   // "1.0 will record all sessions and 0 will record none"
// @sentry/core/build/types/exports.d.ts
export declare function captureException(exception: unknown, hint?: ExclusiveEventHintOrCaptureContext): string;
export declare function setUser(user: User | null): void;   // User { [key: string]: any; id?: string | number; ip_address?: string | null; email?: string; username?: string; geo?: GeoLocation }
// @sentry/browser/build/npm/types/index.d.ts (reachable through @sentry/react → @sentry/nextjs client): replayIntegration, replayCanvasIntegration, feedbackIntegration
```
### File layout expected (from the package's own build code, `<NM>/@sentry/nextjs/build/cjs/config/withSentryConfig/*.js`, `buildTime.d.ts`)
- **Client**: `instrumentation-client.ts` (or `src/instrumentation-client.ts`). The build warns: "DEPRECATION WARNING: It is recommended renaming your `sentry.client.config.ts` file, or moving its content to `instrumentation-client.ts`. When using Turbopack `sentry.client.config.ts` will no longer work." It also checks the file contains `onRouterTransitionStart` (`suppressOnRouterTransitionStartWarning` silences) → add `export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;`.
- **Server/edge**: `instrumentation.ts` with `register()` calling `Sentry.init` per runtime, and `export const onRequestError = Sentry.captureRequestError;` (build message: `Sentry.init` "must be called inside of an instrumentation file"; a missing `onRequestError` "hook in instrumentation file … indicates outdated configuration"). Splitting into `sentry.server.config.ts`/`sentry.edge.config.ts` imported from `register()` is the wizard's convention — NOT CONFIRMED FROM PACKAGE FILES beyond those strings. `process.env.NEXT_RUNTIME` branching is a Next convention, NOT CONFIRMED FROM PACKAGE FILES.

### Gotchas
1. **Replay is opt-in**: the browser default integration list (`<NM>/@sentry/browser/build/npm/esm/dev/sdk.js` `getDefaultIntegrations`) contains inboundFilters, functionToString, conversationId, browserApiErrors, breadcrumbs, globalHandlers, linkedErrors, dedupe, httpContext, cultureContext, browserSession — **no Replay/Feedback**. Simply never call `replayIntegration()`, `replayCanvasIntegration()` or `feedbackIntegration()`; additionally set `replaysSessionSampleRate: 0, replaysOnErrorSampleRate: 0` as a belt-and-braces guard.
2. `sendDefaultPii` is deprecated (v11 removes it) in favour of `dataCollection`; leave both unset (default off) and scrub in `beforeSend`/`beforeBreadcrumb`. `setUser({ id })` only — no email/IP.
3. Import `withSentryConfig` from `@sentry/nextjs/config` (root export removed in v11). Next 16/Turbopack: `sentry.client.config.ts` is not picked up — use `instrumentation-client.ts`.
4. `tunnelRoute` (build option) proxies events through your domain; `disableLogger: true` tree-shakes SDK logs; `widenClientFileUpload` improves stack traces.
5. Breadcrumbs (`console`, `fetch`, `xhr`) can carry transcript text/URLs — drop or trim them in `beforeBreadcrumb`; `ignoreErrors` for known noisy errors.

### Snippet
```ts
// next.config.ts
import { withSentryConfig } from '@sentry/nextjs/config';
export default withSentryConfig(nextConfig, { org: 'kaizen', project: 'web', silent: !process.env.CI, widenClientFileUpload: true, tunnelRoute: '/monitoring', disableLogger: true });
// instrumentation-client.ts
import * as Sentry from '@sentry/nextjs';
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN, replaysSessionSampleRate: 0, replaysOnErrorSampleRate: 0, tracesSampleRate: 0.1,
  beforeSend(event) { if (event.user) { delete event.user.email; delete event.user.ip_address; } delete event.request?.cookies; return event; },
  beforeBreadcrumb(b) { return b.category === 'console' ? null : b; },
});
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
// instrumentation.ts
import * as Sentry from '@sentry/nextjs';
export async function register() { Sentry.init({ dsn: process.env.SENTRY_DSN, tracesSampleRate: 0.1 }); }
export const onRequestError = Sentry.captureRequestError;
// anywhere server-side after auth(): Sentry.setUser({ id: userId });
```
---

## 8. `resend` 6.26.0

- Install: `npm i resend` (+ `npm i @react-email/render` if you use `react:`; optional peer `*`). Node `>=20`; deps `postal-mime`, `standardwebhooks`. ESM `dist/index.mjs` / CJS `dist/index.cjs`; types `dist/index.d.mts`.

### API (`<NM>/resend/dist/index.d.mts`)
```ts
declare class Resend { constructor(key?: string | undefined, options?: ResendOptions); readonly emails: Emails; /* batch, contacts, domains, webhooks, … */ }
interface ResendOptions { baseUrl?: string; userAgent?: string; }
declare class Emails { send(payload: CreateEmailOptions, options?: CreateEmailRequestOptions): Promise<CreateEmailResponse>;
  create(payload: CreateEmailOptions, options?: CreateEmailRequestOptions): Promise<CreateEmailResponse>; get(id: string): Promise<GetEmailResponse>; cancel(id: string): Promise<CancelEmailResponse>; /* … */ }
interface EmailRenderOptions$1 { react: React$1.ReactNode; html: string; text: string; }     // wrapped in RequireAtLeastOne<>
interface CreateEmailBaseOptions { from: string /* "Your Name <sender@domain.com>" */; to: string | string[] /* Max 50 */; subject: string; cc?: string | string[]; bcc?: string | string[];
  replyTo?: string | string[]; headers?: Record<string, string>; attachments?: Attachment[]; tags?: Tag[]; scheduledAt?: string /* ISO 8601 */; topicId?: string | null; }
type CreateEmailOptions = ((RequireAtLeastOne<EmailRenderOptions$1> & CreateEmailBaseOptions) & { template?: never; })
                        | ((EmailTemplateOptions & CreateEmailBaseOptionsWithTemplate) & { react?: never; html?: never; text?: never; });
interface CreateEmailRequestOptions extends PostOptions /* { query?; headers?: HeadersInit } */, IdempotentRequest /* { idempotencyKey?: string } */ {}
interface CreateEmailResponseSuccess { id: string; }
type CreateEmailResponse = Response<CreateEmailResponseSuccess>;
type Response<T> = ({ data: T; error: null } | { error: ErrorResponse; data: null }) & { headers: Record<string, string> | null };
type ErrorResponse = { message: string; statusCode: number | null; name: RESEND_ERROR_CODE_KEY /* 'validation_error' | 'missing_api_key' | 'invalid_api_key' | 'rate_limit_exceeded' | 'daily_quota_exceeded' | 'monthly_quota_exceeded' | … */ };
```
### Gotchas
1. `send()` resolves (does not throw) on API errors — always branch on `error` (discriminated union) before reading `data.id`.
2. At least one of `react | html | text` is required (`RequireAtLeastOne`), unless you use `template: { id, variables }` (then none allowed).
3. `react:` needs `@react-email/render`; in `.ts` files pass `jsx(EmailTemplate, props)` from `react/jsx-runtime` (readme).
4. `from` domain must be verified in the Resend dashboard (readme). Pass `{ idempotencyKey }` as the 2nd arg for safe retries (`Idempotency-Key` header).
5. Key argument is optional in the type; env-var fallback is NOT CONFIRMED FROM PACKAGE FILES — pass it explicitly. Edge-runtime support NOT CONFIRMED (fetch-based, Node `>=20` declared).

### Snippet
```ts
import { Resend } from 'resend';
const resend = new Resend(process.env.RESEND_API_KEY as string);
export async function sendReceipt(to: string, html: string, key: string) {
  const { data, error } = await resend.emails.send({ from: 'Kaizen Tutor <hello@kaizen.example>', to, subject: 'Your session summary', html, text: 'Open in a browser.' }, { idempotencyKey: key });
  if (error) throw new Error(`${error.name}: ${error.message}`);
  return data.id;
}
```
---

## 9. `@neondatabase/serverless` 1.1.0

- Install: `npm i @neondatabase/serverless`. Node `>=19.0.0`. `require: ./index.js`, `import: ./index.mjs`; types `index.d.ts`/`index.d.mts`. Docs in-package: `README.md`, `CONFIG.md`, `DEPLOY.md`.

### API (`<NM>/@neondatabase/serverless/index.d.ts`)
```ts
export declare function neon<ArrayMode extends boolean = false, FullResults extends boolean = false>(connectionString: string,
  { arrayMode, fullResults, fetchOptions, isolationLevel, readOnly, deferrable, authToken, disableWarningInBrowsers }?: HTTPTransactionOptions<ArrayMode, FullResults>): NeonQueryFunction<ArrayMode, FullResults>;
export declare interface NeonQueryFunction<ArrayMode extends boolean, FullResults extends boolean> {
  (strings: TemplateStringsArray, ...params: any[]): NeonQueryPromise<ArrayMode, FullResults, FullResults extends true ? FullQueryResults<ArrayMode> : QueryRows<ArrayMode>>;
  query<…>(queryWithPlaceholders: string, params?: any[], queryOpts?: HTTPQueryOptions<…>): NeonQueryPromise<…>;
  unsafe(rawSQL: string): UnsafeRawSql;   // "must be used only with trusted string values"
  transaction: <…>(queriesOrFn: NeonQueryPromise<ArrayMode, FullResults>[] | ((sql: NeonQueryFunctionInTransaction<…>) => NeonQueryInTransaction[]),
                   opts?: HTTPTransactionOptions<…>) => Promise<FullResultsOverride extends true ? FullQueryResults<…>[] : QueryRows<…>[]>;
}
export declare type QueryRows<ArrayMode extends boolean> = ArrayMode extends true ? any[][] : Record<string, any>[];
export declare interface FullQueryResults<ArrayMode extends boolean> { fields: FieldDef[]; command: string; rowCount: number; rows: QueryRows<ArrayMode>; rowAsArray: ArrayMode; }
export declare interface HTTPQueryOptions<…> { arrayMode?: ArrayMode; fullResults?: FullResults; fetchOptions?: Record<string, any>;
  authToken?: string | (() => Promise<string> | string) /* Bearer token */; types?: CustomTypesConfig; disableWarningInBrowsers?: boolean; }
export declare interface HTTPTransactionOptions<…> extends HTTPQueryOptions<…> { isolationLevel?: 'ReadUncommitted' | 'ReadCommitted' | 'RepeatableRead' | 'Serializable'; readOnly?: boolean; deferrable?: boolean; }
export declare class Pool extends Pool_2 { /* node-postgres Pool: constructor(config?: PoolConfig); connect(): Promise<PoolClient>; query(text, values?): Promise<QueryResult>; end(); on('error'|'connect'|'acquire'|'release'|'remove', …) */ }
export declare class Client extends Client_2 { constructor(config?: string | ClientConfig); connect(): Promise<void>; get neonConfig(): neonConfig; /* Client_2: end(): Promise<void>; query(...) */ }
export declare class NeonDbError extends Error { name: "NeonDbError"; severity; code; detail; hint; position; schema; table; column; constraint; sourceError: Error | undefined; }
export declare interface NeonConfig { poolQueryViaFetch: boolean; fetchEndpoint; fetchFunction: any; webSocketConstructor: WebSocketConstructor | undefined; wsProxy; useSecureWebSocket: boolean;
  forceDisablePgSSL: boolean; coalesceWrites: boolean; pipelineConnect: 'password' | false; subtls; rootCerts: string; pipelineTLS: boolean; disableSNI: boolean; disableWarningInBrowsers: boolean; }
```
### Gotchas (README/CONFIG.md)
1. `neon()` = **one HTTPS fetch per query**: "sessions and transactions are not supported" except via `sql.transaction([...])`, which runs several queries in ONE non-interactive transaction (array or non-`async` function form); you cannot branch on intermediate results inside it.
2. `Pool`/`Client` use WebSockets and behave like node-postgres (Kysely/Drizzle-pg compatible). "In serverless environments such as Vercel Edge Functions … WebSocket connections can't outlive a single request": create, use and `end()` inside the handler (README shows `ctx.waitUntil(pool.end())`). Node ≤21 needs `neonConfig.webSocketConstructor = ws`.
3. Edge: `neon()` works on Vercel Edge Functions (README example with `runtime: 'edge'`); the `pg` alias/override trick makes it a drop-in for libraries depending on `pg`.
4. Result shape: rows array by default (not `{rows}`); `fullResults: true` for `{ rows, fields, rowCount, command }`; `sql.query(text, [$1…])` for dynamic SQL; `sql.unsafe()` only for trusted identifiers.
5. `authToken` sets `Authorization: Bearer …` per request (e.g. a Clerk JWT for Neon RLS). Errors are `NeonDbError` with Postgres `code`/`constraint` (specific code values NOT CONFIRMED FROM PACKAGE FILES).

### Snippet
```ts
import { neon } from '@neondatabase/serverless';
const sql = neon(process.env.DATABASE_URL as string);
export async function recordSession(userId: string, minutes: number) {
  const [row] = await sql`INSERT INTO sessions (user_id, minutes) VALUES (${userId}, ${minutes}) RETURNING id`;
  return row?.id as string | undefined;
}
export async function usageAndPlan(userId: string) {
  const [usage, acct] = await sql.transaction([
    sql`SELECT COALESCE(SUM(minutes), 0) AS minutes FROM sessions WHERE user_id = ${userId} AND started_at >= date_trunc('month', now())`,
    sql`SELECT plan FROM accounts WHERE user_id = ${userId}`,
  ], { readOnly: true });
  return { minutes: Number(usage[0]?.minutes ?? 0), plan: (acct[0]?.plan as string | undefined) ?? 'free' };
}
```
---

## 10. `heic-convert` 2.1.0

- Install: `npm i heic-convert`. Node `>=12.0.0`; deps `heic-decode ^2.0.0` (2.1.0 → `libheif-js/wasm-bundle` 1.19.8), `jpeg-js ^0.4.4`, `pngjs ^6.0.0`. **No TypeScript types** in the package and `@types/heic-convert` is not installed — add a local ambient module. CJS (`module.exports = one; module.exports.all = all`).

### API (`<NM>/heic-convert/index.js`, `lib.js`, `formats-node.js`, `browser.js`, `formats-browser.js`, README)
```js
// lib.js
one: async ({ buffer, format, quality = 0.92 }) => await convert({ buffer, format, quality, all: false })   // returns encoder output
all: async ({ buffer, format, quality = 0.92 }) => [ { convert: async () => Buffer }, ... ]                   // lazy per image
// convert(): if (!encode[format]) throw new Error(`output format needs to be one of [${Object.keys(encode)}]`)   -> 'JPEG' | 'PNG'
// formats-node.js
JPEG: ({ data, width, height, quality }) => jpegJs.encode({ data, width, height }, Math.floor(quality * 100)).data   // jpeg-js index.d.ts: encode(...): BufferRet = RawImageData<Buffer>  => Buffer
PNG:  ({ data, width, height }) => PNG.sync.write(png, { deflateLevel: 9, deflateStrategy: 3, filterType: -1, colorType: 6, inputHasAlpha: true })   // pngjs packer-sync.js returns Buffer.concat(chunks)
// browser.js  (require('heic-convert/browser')): same API, encodes with <canvas>.toBlob(...) and returns Uint8Array; "currently only supported in the main thread"
// heic-decode/lib.js: throws TypeError('input buffer is not a HEIC image') unless brand is mif1|msf1|heic|heix|hevc|hevx
```
Ambient type to add (`types/heic-convert.d.ts`):
```ts
declare module 'heic-convert' {
  interface Options { buffer: Buffer | Uint8Array; format: 'JPEG' | 'PNG'; quality?: number }
  function convert(options: Options): Promise<Buffer>;
  namespace convert { function all(options: Options): Promise<Array<{ convert(): Promise<Buffer> }>> }
  export = convert;
}
```
### Gotchas
1. **Node-only by default** (returns a Node `Buffer`; wasm libheif + pure-JS encoders). Run it in a Node route handler, never on the edge runtime. `heic-convert/browser` exists for client-side use (canvas encoders, `Uint8Array`).
2. README: "a lot of work is still done synchronously … consider using a worker thread"; a 12 MP HEIC can block the event loop for seconds — watch Vercel function time/memory limits.
3. `quality` is 0–1 and applies to JPEG only (default 0.92); PNG always uses `deflateLevel: 9` (slow). Non-HEIC input throws `TypeError` — sniff/catch and fall back.
4. `convert.all` decodes each image lazily on `image.convert()` — use it for burst/multi-image HEICs.

### Snippet
```ts
import convert from 'heic-convert';   // needs the ambient module above (esModuleInterop)
export async function heicToJpeg(input: Buffer): Promise<Buffer> {
  return convert({ buffer: input, format: 'JPEG', quality: 0.85 });
}
```
