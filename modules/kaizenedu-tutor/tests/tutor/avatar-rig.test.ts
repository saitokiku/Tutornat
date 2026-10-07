// @vitest-environment jsdom

/**
 * The rig as it is actually mounted: the SVG the driver builds, and the choice
 * between it and a commissioned Rive character
 * (`components/tutor/avatar/svg-rig.ts`, `rive-rig.ts`, `create-driver.ts`).
 *
 * The rig takes its clock, its frame scheduler, and its randomness as options,
 * so every frame here is stepped by hand: no `requestAnimationFrame`, no
 * wall-clock, no flake. `avatar-motion.test.ts` covers the timing curves
 * themselves; this file covers what they do to the DOM, and the fallback.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createAvatarDriver } from '@/components/tutor/avatar/create-driver';
import { RIVE_INPUTS } from '@/components/tutor/avatar/config';
import { BLINK_CLOSE_MS, BLINK_MIN_GAP_MS } from '@/components/tutor/avatar/rig-motion';
import {
  createRiveAvatarDriver,
  type RiveConstructorParams,
  type RiveRuntime,
  type RiveStateMachineInput,
} from '@/components/tutor/avatar/rive-rig';
import { createSvgAvatarDriver, type SvgRigOptions } from '@/components/tutor/avatar/svg-rig';

const hosts: HTMLElement[] = [];

afterEach(() => {
  for (const host of hosts.splice(0)) host.remove();
});

function mount(options: SvgRigOptions = {}) {
  const host = document.createElement('div');
  document.body.appendChild(host);
  hosts.push(host);
  let now = 0;
  let pending: ((t: number) => void) | null = null;
  const driver = createSvgAvatarDriver(host, {
    clock: () => now,
    schedule: (callback) => {
      pending = callback;
      return 1;
    },
    cancel: () => {
      pending = null;
    },
    random: () => 0.5,
    reducedMotion: () => false,
    ...options,
  });
  const step = (ms = 16, frames = 1) => {
    for (let i = 0; i < frames; i += 1) {
      now += ms;
      pending?.(now);
    }
  };
  const svg = host.querySelector('svg');
  if (!svg) throw new Error('the rig did not mount an svg');
  const part = (name: string, side?: -1 | 1): Element => {
    const selector =
      side === undefined ? `[data-part="${name}"]` : `[data-part="${name}"][data-side="${side}"]`;
    const node = svg.querySelector(selector);
    if (!node) throw new Error(`no ${selector}`);
    return node;
  };
  return { host, driver, step, svg, part, at: () => now };
}

describe('the rig mounts an accessible face', () => {
  it('names itself and draws every part', () => {
    const rig = mount({ label: 'Tutor, listening' });
    expect(rig.svg.getAttribute('role')).toBe('img');
    expect(rig.svg.getAttribute('aria-label')).toBe('Tutor, listening');
    for (const name of ['stage', 'head', 'mouth', 'glow', 'dots']) {
      expect(rig.svg.querySelectorAll(`[data-part="${name}"]`).length).toBe(1);
    }
    for (const name of ['iris', 'lid', 'lid-line', 'brow', 'spark']) {
      expect(rig.svg.querySelectorAll(`[data-part="${name}"]`).length).toBe(2);
    }
  });

  it('gives each mounted rig its own clip ids, so two on a page do not collide', () => {
    const first = mount();
    const second = mount();
    const ids = [first, second].flatMap((rig) =>
      [...rig.svg.querySelectorAll('clipPath')].map((node) => node.getAttribute('id')),
    );
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('removes itself and stops asking for frames when disposed', () => {
    const rig = mount();
    rig.driver.dispose();
    expect(rig.host.querySelector('svg')).toBeNull();
    // A frame after disposal must not throw or resurrect anything.
    rig.step(16, 3);
    expect(rig.host.querySelector('svg')).toBeNull();
  });
});

describe('gaze moves the pupil, not the highlight', () => {
  it('translates the iris and leaves the specular highlight where it was', () => {
    const rig = mount();
    const spark = rig.part('spark');
    const before = spark.getAttribute('cx');
    rig.driver.setGaze({ x: 1, y: 0 });
    rig.step(16, 60);

    for (const side of [-1, 1] as const) {
      const transform = rig.part('iris', side).getAttribute('transform') ?? '';
      const x = Number(/translate\((-?[\d.]+)/.exec(transform)?.[1]);
      expect(x).toBeGreaterThan(3);
    }
    // The highlight is a sibling of the iris group, so nothing moved it.
    expect(spark.getAttribute('cx')).toBe(before);
    expect(spark.getAttribute('transform')).toBeNull();
  });

  it('sends the pupils the other way for the other side', () => {
    const rig = mount();
    rig.driver.setGaze({ x: -1, y: 0 });
    rig.step(16, 60);
    const transform = rig.part('iris', -1).getAttribute('transform') ?? '';
    expect(Number(/translate\((-?[\d.]+)/.exec(transform)?.[1])).toBeLessThan(-3);
  });

  it('keeps the pupil inside the eye at the extremes', () => {
    const rig = mount();
    for (const gaze of [
      { x: 5, y: 5 },
      { x: -5, y: -5 },
    ]) {
      rig.driver.setGaze(gaze);
      rig.step(16, 80);
      const transform = rig.part('iris', 1).getAttribute('transform') ?? '';
      const parsed = /translate\((-?[\d.]+) (-?[\d.]+)\)/.exec(transform);
      expect(parsed).not.toBeNull();
      const [x, y] = (parsed ?? ['', '0', '0']).slice(1, 3).map(Number);
      expect(Math.abs(x)).toBeLessThanOrEqual(9);
      expect(Math.abs(y)).toBeLessThanOrEqual(9);
    }
  });
});

/** How far the upper-lid curve reaches: `M x y Q cx cy x y`, y values only. */
function lidSpread(d: string | null): number {
  const values = [...(d ?? '').matchAll(/-?\d+\.\d+/g)].map(Number);
  const ys = values.filter((_, i) => i % 2 === 1);
  return Math.max(...ys) - Math.min(...ys);
}

describe('the lids close', () => {
  it('collapses the eye onto a line mid-blink and reopens it', () => {
    // The injected roll of 0.5 puts the first blink at the middle of the gap.
    const rig = mount();
    const open = rig.part('lid').getAttribute('d');
    const blinkAt = BLINK_MIN_GAP_MS + 0.5 * (7_400 - 2_200);

    rig.step(blinkAt, 1);
    rig.step(BLINK_CLOSE_MS, 1);
    const shut = rig.part('lid').getAttribute('d');
    expect(shut).not.toBe(open);
    // Both lid curves now sit on the same y, so the almond has zero area.
    expect(lidSpread(shut)).toBeLessThan(1);
    expect(lidSpread(open)).toBeGreaterThan(20);

    rig.step(400, 1);
    expect(lidSpread(rig.part('lid').getAttribute('d'))).toBeGreaterThan(20);
  });
});

describe('the mouth', () => {
  function mouthBox(rig: ReturnType<typeof mount>): { width: number; height: number } {
    const d = rig.part('mouth').getAttribute('d') ?? '';
    const numbers = [...d.matchAll(/-?\d+\.\d+/g)].map(Number);
    const xs = numbers.filter((_, i) => i % 2 === 0);
    const ys = numbers.filter((_, i) => i % 2 === 1);
    return { width: Math.max(...xs) - Math.min(...xs), height: Math.max(...ys) - Math.min(...ys) };
  }

  it('opens on loud speech and closes again when the tutor stops', () => {
    const rig = mount();
    rig.driver.setState('speaking');
    rig.driver.setMouth(0.9);
    rig.step(16, 60);
    const loud = mouthBox(rig);
    expect(loud.height).toBeGreaterThan(12);

    rig.driver.setMouth(0);
    rig.step(16, 60);
    expect(mouthBox(rig).height).toBeLessThan(loud.height / 2);
  });

  it('ignores amplitude while the tutor is not speaking', () => {
    const rig = mount();
    rig.driver.setState('listening');
    rig.driver.setMouth(0.95);
    rig.step(16, 60);
    expect(mouthBox(rig).height).toBeLessThan(12);
  });

  it('draws a narrow rounded shape and a wide one at different amplitudes', () => {
    const rig = mount();
    rig.driver.setState('speaking');
    rig.driver.setMouth(0.45);
    rig.step(16, 60);
    const round = mouthBox(rig);
    rig.driver.setMouth(0.95);
    rig.step(16, 60);
    const wide = mouthBox(rig);
    expect(wide.width).toBeGreaterThan(round.width + 8);
  });
});

describe('reduced motion', () => {
  it('holds the head still while a full-motion rig breathes and sways', () => {
    const moving = mount({ reducedMotion: () => false });
    const still = mount({ reducedMotion: () => true });
    const read = (rig: ReturnType<typeof mount>) => rig.part('stage').getAttribute('transform');

    moving.step(16, 40);
    still.step(16, 40);
    const movingFirst = read(moving);
    const stillFirst = read(still);

    moving.step(400, 6);
    still.step(400, 6);
    expect(read(moving)).not.toBe(movingFirst);
    expect(read(still)).toBe(stillFirst);
  });

  it('still shows every state: gaze, mouth, and the thinking cue', () => {
    const rig = mount({ reducedMotion: () => true });
    const restingMouth = rig.part('mouth').getAttribute('d');

    rig.driver.setGaze({ x: 1, y: 0 });
    rig.driver.setState('speaking');
    rig.driver.setMouth(0.9);
    rig.step(16, 4);
    expect(rig.part('iris', 1).getAttribute('transform')).toMatch(/translate\([1-9]/);
    expect(rig.part('mouth').getAttribute('d')).not.toBe(restingMouth);

    rig.driver.setState('thinking');
    rig.step(16, 4);
    expect(Number(rig.part('dots').getAttribute('opacity'))).toBeGreaterThan(0.9);
  });

  it('drops the listening glow, which is decoration rather than state', () => {
    const rig = mount({ reducedMotion: () => true });
    rig.driver.setState('listening');
    rig.step(16, 30);
    expect(Number(rig.part('glow').getAttribute('opacity'))).toBe(0);
  });
});

/** Springs settle asymptotically, so poses are compared with a tolerance. */
function numbers(d: string | null): number[] {
  return [...(d ?? '').matchAll(/-?\d+\.\d+/g)].map(Number);
}

function maxDelta(a: string | null, b: string | null): number {
  const left = numbers(a);
  const right = numbers(b);
  if (left.length !== right.length || left.length === 0) return Infinity;
  return Math.max(...left.map((value, i) => Math.abs(value - right[i])));
}

describe('reactions', () => {
  it('runs anticipation, then settles, then returns to the resting pose', () => {
    const rig = mount();
    const rest = rig.part('mouth').getAttribute('d');
    rig.driver.react('smile');

    // The first frames of a reaction move away from the target: anticipation.
    rig.step(50, 1);
    const anticipating = rig.part('mouth').getAttribute('d');
    rig.step(16, 30);
    const landed = rig.part('mouth').getAttribute('d');
    expect(maxDelta(anticipating, landed)).toBeGreaterThan(1);
    expect(maxDelta(rest, landed)).toBeGreaterThan(1);

    rig.step(200, 20);
    expect(maxDelta(rig.part('mouth').getAttribute('d'), rest)).toBeLessThan(0.5);
  });

  it('holds an expression set through `set` until it is cleared', () => {
    const rig = mount();
    const rest = rig.part('mouth').getAttribute('d');
    rig.driver.set({ expression: 'smile' });
    rig.step(16, 40);
    const smiling = rig.part('mouth').getAttribute('d');
    expect(maxDelta(smiling, rest)).toBeGreaterThan(1);

    // Held: it does not decay the way a reaction does.
    rig.step(500, 20);
    expect(maxDelta(rig.part('mouth').getAttribute('d'), smiling)).toBeLessThan(0.5);

    rig.driver.set({ expression: 'neutral' });
    rig.step(16, 60);
    expect(maxDelta(rig.part('mouth').getAttribute('d'), rest)).toBeLessThan(0.5);
  });
});

// --- The Rive seam ---------------------------------------------------------

function fakeInputs(names: string[]): RiveStateMachineInput[] {
  return names.map((name) => ({ name, value: 0, fire: vi.fn() }));
}

function fakeRuntime(inputs: RiveStateMachineInput[], fail = false): RiveRuntime {
  return {
    Rive: class {
      constructor(params: RiveConstructorParams) {
        queueMicrotask(() => {
          if (fail) params.onLoadError?.(new Error('no such file'));
          else params.onLoad?.();
        });
      }
      stateMachineInputs() {
        return inputs;
      }
      cleanup() {}
    },
  };
}

const FULL_CONTRACT = Object.values(RIVE_INPUTS);

describe('the Rive adapter', () => {
  function host(): HTMLElement {
    const node = document.createElement('div');
    document.body.appendChild(node);
    hosts.push(node);
    return node;
  }

  it('is inert with no character configured', async () => {
    const driver = await createRiveAvatarDriver(host(), {
      loadRuntime: async () => fakeRuntime(fakeInputs(FULL_CONTRACT)),
    });
    expect(driver).toBeNull();
  });

  it('is inert with no runtime available', async () => {
    const driver = await createRiveAvatarDriver(host(), {
      src: '/avatar/tutor.riv',
      loadRuntime: async () => null,
    });
    expect(driver).toBeNull();
  });

  it('refuses a file whose state machine is missing a required input', async () => {
    const partial = FULL_CONTRACT.filter((name) => name !== RIVE_INPUTS.gazeY);
    const node = host();
    const driver = await createRiveAvatarDriver(node, {
      src: '/avatar/tutor.riv',
      loadRuntime: async () => fakeRuntime(fakeInputs(partial)),
    });
    expect(driver).toBeNull();
    expect(node.querySelector('canvas')).toBeNull();
  });

  it('cleans up after a file that will not load', async () => {
    const node = host();
    const driver = await createRiveAvatarDriver(node, {
      src: '/avatar/tutor.riv',
      loadRuntime: async () => fakeRuntime(fakeInputs(FULL_CONTRACT), true),
    });
    expect(driver).toBeNull();
    expect(node.querySelector('canvas')).toBeNull();
  });

  it('maps the driver onto the documented state machine inputs', async () => {
    const inputs = fakeInputs(FULL_CONTRACT);
    const byName = (name: string) => inputs.find((input) => input.name === name);
    const driver = await createRiveAvatarDriver(host(), {
      src: '/avatar/tutor.riv',
      loadRuntime: async () => fakeRuntime(inputs),
    });
    expect(driver).not.toBeNull();
    if (!driver) return;

    driver.setState('at-whiteboard');
    expect(byName(RIVE_INPUTS.state)?.value).toBe(4);

    driver.setMouth(0.5);
    expect(byName(RIVE_INPUTS.mouth)?.value).toBe(50);

    driver.setGaze({ x: 0.85, y: -0.5 });
    expect(byName(RIVE_INPUTS.gazeX)?.value).toBe(85);
    expect(byName(RIVE_INPUTS.gazeY)?.value).toBe(-50);

    driver.react('not_quite');
    expect(byName(RIVE_INPUTS.reactNotQuite)?.fire).toHaveBeenCalled();
    expect(byName(RIVE_INPUTS.expression)?.value).toBe(2);
  });

  it('clamps out-of-range inputs rather than passing them through', async () => {
    const inputs = fakeInputs(FULL_CONTRACT);
    const byName = (name: string) => inputs.find((input) => input.name === name);
    const driver = await createRiveAvatarDriver(host(), {
      src: '/avatar/tutor.riv',
      loadRuntime: async () => fakeRuntime(inputs),
    });
    driver?.setMouth(4);
    driver?.setGaze({ x: -9, y: 9 });
    expect(byName(RIVE_INPUTS.mouth)?.value).toBe(100);
    expect(byName(RIVE_INPUTS.gazeX)?.value).toBe(-100);
    expect(byName(RIVE_INPUTS.gazeY)?.value).toBe(100);
  });
});

describe('choosing a rig', () => {
  function host(): HTMLElement {
    const node = document.createElement('div');
    document.body.appendChild(node);
    hosts.push(node);
    return node;
  }

  it('keeps the SVG rig when no character is configured', async () => {
    const node = host();
    // `presence` is explicit throughout this block: the shipped default is the
    // abstract presence (`avatar-presence.test.ts` guards that), and these
    // tests are about the character rig and the Rive fallback around it.
    const driver = createAvatarDriver(node, { presence: 'character', svgOnly: true });
    await Promise.resolve();
    expect(node.querySelector('svg')).not.toBeNull();
    expect(node.querySelector('canvas')).toBeNull();
    driver.dispose();
  });

  it('keeps the SVG rig when the character fails to load', async () => {
    const node = host();
    const driver = createAvatarDriver(node, {
      presence: 'character',
      rive: {
        src: '/avatar/tutor.riv',
        loadRuntime: async () => fakeRuntime(fakeInputs(FULL_CONTRACT), true),
      },
    });
    await vi.waitFor(() => expect(node.querySelector('canvas')).toBeNull());
    expect(node.querySelector('svg')).not.toBeNull();
    driver.dispose();
  });

  it('swaps to the character and replays the state the face is already in', async () => {
    const inputs = fakeInputs(FULL_CONTRACT);
    const byName = (name: string) => inputs.find((input) => input.name === name);
    const node = host();
    const driver = createAvatarDriver(node, {
      presence: 'character',
      rive: { src: '/avatar/tutor.riv', loadRuntime: async () => fakeRuntime(inputs) },
    });
    // The learner is mid-session before the asset lands.
    driver.setState('speaking');
    driver.setGaze({ x: 0.85, y: 0.15 });
    driver.setMouth(0.4);

    await vi.waitFor(() => expect(node.querySelector('canvas')).not.toBeNull());
    expect(node.querySelector('svg')).toBeNull();
    expect(byName(RIVE_INPUTS.state)?.value).toBe(3);
    expect(byName(RIVE_INPUTS.gazeX)?.value).toBe(85);
    expect(byName(RIVE_INPUTS.mouth)?.value).toBe(40);
    driver.dispose();
  });
});
