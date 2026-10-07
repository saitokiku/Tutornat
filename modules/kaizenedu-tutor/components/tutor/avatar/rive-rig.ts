/**
 * The Rive adapter: the same `AvatarDriver`, backed by a commissioned `.riv`
 * character instead of the built-in SVG rig (R31; presence-layer skill).
 *
 * ## Why this exists before the art does
 *
 * `AvatarDriver` was designed so the rig could be swapped in one file. This is
 * that file, written and wired now so that commissioning a character is an
 * asset drop and a config value, not a refactor of the session screen. Rive is
 * the target because it is a state-machine runtime — an illustrator authors
 * the blends, the overshoot and the visemes inside the file, and the app sets
 * inputs — which is exactly the shape of `AvatarDriver`, and it is what
 * Duolingo ships its characters on.
 *
 * ## Why the runtime is loaded, not imported
 *
 * `@rive-app/canvas` is deliberately **not** a dependency yet: adding a
 * runtime to the client bundle to support an asset nobody has commissioned
 * would be a cost with no product behind it (CLAUDE.md: no new dependency
 * without a justification). So the runtime arrives through `loadRuntime`,
 * which by default looks for a global the host page may have registered and
 * then, if `NEXT_PUBLIC_RIVE_RUNTIME_URL` is set, imports it from there.
 *
 * When the character is commissioned, the change is two lines: add
 * `@rive-app/canvas` to `package.json`, and replace `defaultRiveRuntime` with
 *
 *     const defaultRiveRuntime = () => import('@rive-app/canvas');
 *
 * Nothing else in this file, and nothing above it, changes.
 *
 * ## Degrading
 *
 * Every failure path returns `null` rather than throwing: no source
 * configured, no runtime available, a file that will not load, a state machine
 * whose inputs do not match `RIVE_INPUTS`. `create-driver.ts` treats `null` as
 * "keep the SVG rig", so a broken or missing asset costs the learner nothing.
 *
 * `README.md` in this folder is the art brief and the input contract.
 */
import type { ReactionKind } from '@/lib/tutor/contracts';

import {
  RIVE_ARTBOARD,
  RIVE_AVATAR_SRC,
  RIVE_EXPRESSION_VALUES,
  RIVE_INPUTS,
  RIVE_RUNTIME_URL,
  RIVE_STATE_MACHINE,
  RIVE_STATE_VALUES,
} from './config';
import type { AvatarDriver, AvatarInputs, AvatarState } from './driver';

// --- The slice of the Rive runtime this adapter uses ------------------------
// Typed structurally so the adapter compiles with the package absent. When it
// becomes a dependency these can be replaced by its own exported types.

export interface RiveStateMachineInput {
  readonly name: string;
  value: number | boolean;
  fire?: () => void;
}

export interface RiveInstance {
  stateMachineInputs(stateMachineName: string): RiveStateMachineInput[] | undefined;
  resizeDrawingSurfaceToCanvas?: () => void;
  cleanup(): void;
}

export interface RiveConstructorParams {
  canvas: HTMLCanvasElement;
  src: string;
  artboard?: string;
  stateMachines?: string;
  autoplay: boolean;
  onLoad?: () => void;
  onLoadError?: (error: unknown) => void;
}

export interface RiveRuntime {
  Rive: new (params: RiveConstructorParams) => RiveInstance;
}

function isRiveRuntime(value: unknown): value is RiveRuntime {
  return (
    typeof value === 'object' && value !== null && typeof Reflect.get(value, 'Rive') === 'function'
  );
}

/**
 * Find the runtime without importing it: a global first (a `<script>` tag, or
 * an app that already imports the package), then the configured URL.
 */
export async function defaultRiveRuntime(): Promise<RiveRuntime | null> {
  if (typeof window !== 'undefined') {
    const global = Reflect.get(window, 'rive');
    if (isRiveRuntime(global)) return global;
  }
  if (!RIVE_RUNTIME_URL) return null;
  try {
    // A variable specifier, so no bundler tries to resolve a package that is
    // not installed. The URL is a build-time config value, never user input.
    const loaded: unknown = await import(/* webpackIgnore: true */ RIVE_RUNTIME_URL);
    if (isRiveRuntime(loaded)) return loaded;
    const inner =
      typeof loaded === 'object' && loaded !== null ? Reflect.get(loaded, 'default') : null;
    return isRiveRuntime(inner) ? inner : null;
  } catch {
    return null;
  }
}

export interface RiveRigOptions {
  label?: string;
  src?: string;
  stateMachine?: string;
  artboard?: string;
  reducedMotion?: () => boolean;
  /** Test and migration seam; see the header note. */
  loadRuntime?: () => Promise<RiveRuntime | null>;
  /** How long to wait for the file before giving up and keeping the SVG rig. */
  timeoutMs?: number;
}

const LOAD_TIMEOUT_MS = 4_000;

function numberInput(
  inputs: readonly RiveStateMachineInput[],
  name: string,
): RiveStateMachineInput | null {
  const found = inputs.find((input) => input.name === name);
  return found ?? null;
}

/**
 * Mount a Rive character into `host` and drive it through `AvatarDriver`.
 * Resolves `null` whenever the character cannot be shown, which is the signal
 * to keep the SVG rig.
 */
export async function createRiveAvatarDriver(
  host: HTMLElement,
  options: RiveRigOptions = {},
): Promise<AvatarDriver | null> {
  const src = options.src ?? RIVE_AVATAR_SRC;
  if (!src) return null;

  const runtime = await (options.loadRuntime ?? defaultRiveRuntime)();
  if (!runtime) return null;

  const canvas = document.createElement('canvas');
  canvas.style.display = 'block';
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', options.label ?? 'The tutor’s face');
  host.appendChild(canvas);

  const stateMachine = options.stateMachine ?? RIVE_STATE_MACHINE;
  const artboard = options.artboard ?? RIVE_ARTBOARD;

  let instance: RiveInstance;
  try {
    instance = await new Promise<RiveInstance>((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error('rive load timed out')),
        options.timeoutMs ?? LOAD_TIMEOUT_MS,
      );
      const created = new runtime.Rive({
        canvas,
        src,
        stateMachines: stateMachine,
        autoplay: true,
        ...(artboard ? { artboard } : {}),
        onLoad: () => {
          clearTimeout(timer);
          resolve(created);
        },
        onLoadError: (error: unknown) => {
          clearTimeout(timer);
          reject(error instanceof Error ? error : new Error('rive load failed'));
        },
      });
    });
  } catch {
    canvas.remove();
    return null;
  }

  const inputs = instance.stateMachineInputs(stateMachine) ?? [];
  const state = numberInput(inputs, RIVE_INPUTS.state);
  const mouth = numberInput(inputs, RIVE_INPUTS.mouth);
  const gazeX = numberInput(inputs, RIVE_INPUTS.gazeX);
  const gazeY = numberInput(inputs, RIVE_INPUTS.gazeY);
  const expression = numberInput(inputs, RIVE_INPUTS.expression);
  const reactSmile = numberInput(inputs, RIVE_INPUTS.reactSmile);
  const reactNotQuite = numberInput(inputs, RIVE_INPUTS.reactNotQuite);
  const reducedMotion = numberInput(inputs, RIVE_INPUTS.reducedMotion);

  // A file that does not carry the contract is not a tutor face. Rather than
  // show a character that ignores half of what the orchestrator says, hand the
  // screen back to the SVG rig.
  if (!state || !mouth || !gazeX || !gazeY || !expression) {
    instance.cleanup();
    canvas.remove();
    return null;
  }

  if (reducedMotion && options.reducedMotion) reducedMotion.value = options.reducedMotion();
  instance.resizeDrawingSurfaceToCanvas?.();

  const clamp01 = (value: number) => (value < 0 ? 0 : value > 1 ? 1 : value);
  const clampUnit = (value: number) => (value < -1 ? -1 : value > 1 ? 1 : value);

  const driver: AvatarDriver = {
    setState(next: AvatarState) {
      const index = RIVE_STATE_VALUES.indexOf(next);
      if (index >= 0) state.value = index;
    },
    setMouth(value) {
      mouth.value = clamp01(Number.isFinite(value) ? value : 0) * 100;
    },
    setGaze(gaze) {
      gazeX.value = clampUnit(gaze.x) * 100;
      gazeY.value = clampUnit(gaze.y) * 100;
    },
    react(kind: ReactionKind) {
      if (kind === 'smile') reactSmile?.fire?.();
      else if (kind === 'not_quite') reactNotQuite?.fire?.();
      const named: AvatarInputs['expression'] =
        kind === 'smile' ? 'smile' : kind === 'not_quite' ? 'not-quite' : 'neutral';
      driver.set({ expression: named });
    },
    set(next) {
      if (next.state) driver.setState(next.state);
      if (typeof next.mouth === 'number') driver.setMouth(next.mouth);
      if (next.gaze) driver.setGaze(next.gaze);
      if (next.expression) {
        const index = RIVE_EXPRESSION_VALUES.indexOf(next.expression);
        if (index >= 0) expression.value = index;
      }
    },
    dispose() {
      instance.cleanup();
      canvas.remove();
    },
  };
  return driver;
}
