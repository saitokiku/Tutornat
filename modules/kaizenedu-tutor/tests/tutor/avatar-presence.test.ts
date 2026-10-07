// @vitest-environment jsdom

/**
 * The abstract presence (`components/tutor/avatar/presence-rig.ts`) and the
 * switch that decides which of the three things the session screen mounts
 * (`config.ts`, `create-driver.ts`).
 *
 * The rig takes its clock, its frame scheduler and its randomness as options,
 * so every frame here is stepped by hand: no `requestAnimationFrame`, no
 * wall-clock, no flake. The claims worth guarding are the ones the design
 * rests on rather than the pixel values:
 *
 * - the default is the presence, and a typo in the env cannot cost a learner
 *   their tutor;
 * - every state is distinguishable from its *static* pose, because under
 *   `prefers-reduced-motion` that is all a learner gets;
 * - listening pushes rings out and thinking pulls broken ones in, which is
 *   what keeps the two apart at a glance;
 * - "not quite" dims the light rather than recolouring the form;
 * - the thinking mote rests between moves, which is the whole difference
 *   between considering and loading.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  localRigFor,
  PRESENCE_KINDS,
  resolvePresence,
  RIVE_INPUTS,
} from '@/components/tutor/avatar/config';
import { createAvatarDriver } from '@/components/tutor/avatar/create-driver';
import { BOARD_GAZE, REACTION_MS } from '@/components/tutor/avatar/driver';
import {
  closedSpline,
  createOnsetTrack,
  createPresenceAvatarDriver,
  litLobe,
  motePosition,
  MOTE_REST_MS,
  MOTE_STEP_DEG,
  MOTE_TRAVEL_MS,
  ONSET_REFRACTORY_MS,
  openSpline,
  type PresenceRigOptions,
} from '@/components/tutor/avatar/presence-rig';
import { reactionTotalMs } from '@/components/tutor/avatar/rig-motion';
import type {
  RiveConstructorParams,
  RiveRuntime,
  RiveStateMachineInput,
} from '@/components/tutor/avatar/rive-rig';

const hosts: HTMLElement[] = [];

afterEach(() => {
  for (const host of hosts.splice(0)) host.remove();
});

function host(): HTMLElement {
  const node = document.createElement('div');
  document.body.appendChild(node);
  hosts.push(node);
  return node;
}

function mount(options: PresenceRigOptions = {}) {
  const node = host();
  let now = 0;
  let pending: ((t: number) => void) | null = null;
  const driver = createPresenceAvatarDriver(node, {
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
  const svg = node.querySelector('svg');
  if (!svg) throw new Error('the presence did not mount an svg');
  const part = (name: string): Element => {
    const found = svg.querySelector(`[data-part="${name}"]`);
    if (!found) throw new Error(`no [data-part="${name}"]`);
    return found;
  };
  const parts = (name: string): Element[] => [...svg.querySelectorAll(`[data-part="${name}"]`)];
  return { node, driver, step, svg, part, parts, at: () => now };
}

/**
 * How far the outline reaches from the centre of the viewBox. The footprint is
 * what separates the states when nothing is allowed to move, so it is the
 * thing to measure rather than any single attribute.
 */
function footprint(path: Element): number {
  const d = path.getAttribute('d') ?? '';
  const numbers = d.match(/-?\d+(?:\.\d+)?/g)?.map(Number) ?? [];
  let max = 0;
  for (let i = 0; i + 1 < numbers.length; i += 2) {
    max = Math.max(max, Math.hypot(numbers[i] - 120, numbers[i + 1] - 120));
  }
  return max;
}

/** The x of the lit end of the light ramp: where the presence is looking. */
function litEndX(svg: SVGSVGElement): number {
  const gradient = svg.querySelector('linearGradient');
  return Number(gradient?.getAttribute('x1') ?? '0');
}

function settle(rig: ReturnType<typeof mount>) {
  rig.step(16, 90);
}

describe('choosing what the tutor is', () => {
  it('defaults to the presence, whatever the env says or fails to say', () => {
    expect(resolvePresence(undefined)).toBe('presence');
    expect(resolvePresence('')).toBe('presence');
    expect(resolvePresence('   ')).toBe('presence');
    expect(resolvePresence('face')).toBe('presence');
    expect(resolvePresence('PRESENCE')).toBe('presence');
  });

  it('accepts the three it knows, trimmed and case-insensitive', () => {
    expect(resolvePresence('character')).toBe('character');
    expect(resolvePresence(' Rive ')).toBe('rive');
    expect(PRESENCE_KINDS).toEqual(['presence', 'character', 'rive']);
  });

  it('backs a Rive build with the character, since that is what it will become', () => {
    expect(localRigFor('presence')).toBe('presence');
    expect(localRigFor('character')).toBe('character');
    expect(localRigFor('rive')).toBe('character');
  });

  it('mounts the presence with no options at all — this is what ships', () => {
    const node = host();
    const driver = createAvatarDriver(node);
    expect(node.querySelector('[data-part="form"]')).not.toBeNull();
    // The character rig's parts are the proof it is not the one on screen.
    expect(node.querySelector('[data-part="mouth"]')).toBeNull();
    driver.dispose();
  });

  it('mounts the character when asked for it, and leaves nothing of the presence', () => {
    const node = host();
    const driver = createAvatarDriver(node, { presence: 'character' });
    expect(node.querySelector('[data-part="mouth"]')).not.toBeNull();
    expect(node.querySelector('[data-part="form"]')).toBeNull();
    driver.dispose();
  });
});

describe('the presence mounts something a screen reader can name', () => {
  it('names itself and draws every part', () => {
    const rig = mount({ label: 'AI tutor, listening' });
    expect(rig.svg.getAttribute('role')).toBe('img');
    expect(rig.svg.getAttribute('aria-label')).toBe('AI tutor, listening');
    for (const name of ['stage', 'aura', 'base', 'form', 'bloom', 'rim', 'highlight', 'core']) {
      expect(rig.svg.querySelectorAll(`[data-part="${name}"]`).length).toBe(1);
    }
    expect(rig.parts('ring').length).toBeGreaterThan(1);
  });

  it('gives each mounted presence its own gradient ids, so two on a page do not collide', () => {
    const first = mount();
    const second = mount();
    const ids = [first, second].flatMap((rig) =>
      [...rig.svg.querySelectorAll('linearGradient, radialGradient')].map((node) =>
        node.getAttribute('id'),
      ),
    );
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('stops drawing and detaches when disposed', () => {
    const rig = mount();
    rig.driver.dispose();
    expect(rig.node.querySelector('svg')).toBeNull();
    // A disposed rig must not keep touching the DOM it no longer owns.
    expect(() => rig.step(16, 5)).not.toThrow();
  });
});

describe('every state reads from its static pose', () => {
  function footprintOf(state: 'idle' | 'listening' | 'thinking', reduced: boolean): number {
    const rig = mount({ reducedMotion: () => reduced });
    rig.driver.setState(state);
    settle(rig);
    return footprint(rig.part('form'));
  }

  it('opens widest to listen and gathers smallest to think', () => {
    const idle = footprintOf('idle', false);
    const listening = footprintOf('listening', false);
    const thinking = footprintOf('thinking', false);
    expect(listening).toBeGreaterThan(idle);
    expect(thinking).toBeLessThan(idle);
  });

  it('keeps that ordering under reduced motion, where nothing else can carry it', () => {
    const idle = footprintOf('idle', true);
    const listening = footprintOf('listening', true);
    const thinking = footprintOf('thinking', true);
    expect(listening).toBeGreaterThan(idle);
    expect(thinking).toBeLessThan(idle);
  });

  it('lights a core while speaking, so the state survives a gap between words', () => {
    const rig = mount();
    rig.driver.setState('speaking');
    rig.driver.setMouth(0);
    settle(rig);
    const silent = Number(rig.part('core').getAttribute('opacity'));
    expect(silent).toBeGreaterThan(0);

    rig.driver.setMouth(0.9);
    settle(rig);
    expect(Number(rig.part('core').getAttribute('opacity'))).toBeGreaterThan(silent);
  });

  it('swells and deforms with the voice rather than holding one shape', () => {
    const rig = mount();
    rig.driver.setState('speaking');
    rig.driver.setMouth(0);
    settle(rig);
    const quiet = footprint(rig.part('form'));

    rig.driver.setMouth(0.95);
    rig.step(16, 6);
    expect(footprint(rig.part('form'))).toBeGreaterThan(quiet);
  });
});

describe('listening pushes out, thinking pulls in', () => {
  it('sends solid rings outward while listening', () => {
    const rig = mount();
    rig.driver.setState('listening');
    rig.step(16, 40);
    const live = rig.parts('ring').filter((node) => Number(node.getAttribute('opacity')) > 0);
    expect(live.length).toBeGreaterThan(0);
    for (const ring of live) expect(ring.getAttribute('stroke-dasharray')).toBe('none');
  });

  it('gathers broken rings inward while thinking', () => {
    const rig = mount();
    rig.driver.setState('thinking');
    rig.step(16, 40);
    const live = rig.parts('ring').filter((node) => Number(node.getAttribute('opacity')) > 0);
    expect(live.length).toBeGreaterThan(0);
    for (const ring of live) expect(ring.getAttribute('stroke-dasharray')).not.toBe('none');
  });

  it('carries an outward ring further when there is a level on the channel', () => {
    const reach = (level: number): number => {
      const rig = mount();
      rig.driver.setState('listening');
      rig.driver.setMouth(level);
      // One frame emits the ring; the rest let it travel the same distance.
      rig.step(16, 30);
      const radii = rig
        .parts('ring')
        .filter((node) => Number(node.getAttribute('opacity')) > 0)
        .map((node) => Number(node.getAttribute('r')));
      return Math.max(...radii);
    };
    expect(reach(0.9)).toBeGreaterThan(reach(0));
  });

  it('shows no rings at all in a state that has none, even after one that did', () => {
    const rig = mount({ reducedMotion: () => true });
    rig.driver.setState('listening');
    rig.step(16, 20);
    expect(rig.parts('ring').some((node) => Number(node.getAttribute('opacity')) > 0)).toBe(true);

    rig.driver.setState('idle');
    rig.step(16, 20);
    expect(rig.parts('ring').every((node) => Number(node.getAttribute('opacity')) === 0)).toBe(
      true,
    );
  });

  it('draws two rings for listening and one broken one for thinking under reduced motion', () => {
    const shown = (state: 'listening' | 'thinking'): Element[] => {
      const rig = mount({ reducedMotion: () => true });
      rig.driver.setState(state);
      rig.step(16, 20);
      return rig.parts('ring').filter((node) => Number(node.getAttribute('opacity')) > 0);
    };
    expect(shown('listening')).toHaveLength(2);
    const thinking = shown('thinking');
    expect(thinking).toHaveLength(1);
    expect(thinking[0]?.getAttribute('stroke-dasharray')).not.toBe('none');
  });
});

describe('the thinking mote considers rather than loads', () => {
  it('rests between moves instead of turning at a constant rate', () => {
    const midRest = MOTE_TRAVEL_MS + MOTE_REST_MS / 2;
    // Anywhere inside one rest window the mote is in exactly the same place.
    expect(motePosition(midRest, false)).toBeCloseTo(motePosition(midRest + 100, false), 6);
    // …and it has moved a whole step by the time the next one begins.
    const cycle = MOTE_TRAVEL_MS + MOTE_REST_MS;
    expect(motePosition(cycle, false) - motePosition(0, false)).toBeCloseTo(MOTE_STEP_DEG, 6);
  });

  it('advances during a move', () => {
    const early = motePosition(MOTE_TRAVEL_MS * 0.25, false);
    const late = motePosition(MOTE_TRAVEL_MS * 0.75, false);
    expect(late).toBeGreaterThan(early);
  });

  it('parks in one place under reduced motion', () => {
    expect(motePosition(0, true)).toBe(motePosition(9_999, true));
  });

  it('is only on screen while thinking', () => {
    const rig = mount();
    settle(rig);
    expect(Number(rig.part('mote').getAttribute('opacity'))).toBeLessThan(0.05);
    rig.driver.setState('thinking');
    settle(rig);
    expect(Number(rig.part('mote').getAttribute('opacity'))).toBeGreaterThan(0.5);
  });
});

describe('the light turns toward what has attention', () => {
  it('moves the lit end of the ramp with the gaze', () => {
    const rig = mount();
    settle(rig);
    const centre = litEndX(rig.svg);
    rig.driver.setGaze(BOARD_GAZE);
    settle(rig);
    const board = litEndX(rig.svg);
    expect(board).toBeGreaterThan(centre);

    rig.driver.setGaze({ x: -1, y: 0 });
    settle(rig);
    expect(litEndX(rig.svg)).toBeLessThan(centre);
  });

  it('leans the whole form toward the board', () => {
    const rig = mount();
    rig.driver.setState('at-whiteboard');
    settle(rig);
    const centred = rig.part('stage').getAttribute('transform') ?? '';
    rig.driver.setGaze(BOARD_GAZE);
    settle(rig);
    const leaning = rig.part('stage').getAttribute('transform') ?? '';
    const x = (value: string) => Number(/translate\((-?[\d.]+)/.exec(value)?.[1] ?? '0');
    expect(x(leaning)).toBeGreaterThan(x(centred) + 5);
  });

  it('picks a lobe on the side the light comes from', () => {
    // The lobes are laid out anticlockwise in SVG space from a fixed rotation;
    // what matters is only that opposite directions pick different lobes.
    expect(litLobe(1, 0)).not.toBe(litLobe(-1, 0));
    expect(litLobe(0, 1)).not.toBe(litLobe(0, -1));
  });
});

describe('reactions are proportionate and end on their own', () => {
  it('goes quiet for "not quite" rather than changing colour', () => {
    const rig = mount();
    settle(rig);
    const gradient = rig.svg.querySelector('linearGradient');
    const stops = [...(gradient?.children ?? [])];
    expect(stops.length).toBeGreaterThan(2);
    const before = stops.map((stop) => stop.getAttribute('stop-color'));
    const litBefore = Number(stops[0]?.getAttribute('stop-opacity'));

    rig.driver.react('not_quite');
    rig.step(16, 30);
    expect(stops.map((stop) => stop.getAttribute('stop-color'))).toEqual(before);
    expect(Number(stops[0]?.getAttribute('stop-opacity'))).toBeLessThan(litBefore);
  });

  it('blooms warm for a correct check and returns to rest by itself', () => {
    const rig = mount();
    rig.driver.setState('idle');
    settle(rig);
    const rest = footprint(rig.part('form'));

    rig.driver.react('smile');
    rig.step(16, 24);
    expect(Number(rig.part('bloom').getAttribute('opacity'))).toBeGreaterThan(0);
    expect(footprint(rig.part('form'))).toBeGreaterThan(rest);

    // Past the whole envelope the reaction has released on its own.
    rig.step(16, Math.ceil(reactionTotalMs(REACTION_MS) / 16) + 60);
    expect(Number(rig.part('bloom').getAttribute('opacity'))).toBeLessThan(0.02);
  });

  it('drops a held expression when set back to neutral', () => {
    const rig = mount();
    rig.driver.set({ expression: 'smile' });
    rig.step(16, 40);
    expect(Number(rig.part('bloom').getAttribute('opacity'))).toBeGreaterThan(0);
    rig.driver.react('neutral');
    rig.step(16, 60);
    expect(Number(rig.part('bloom').getAttribute('opacity'))).toBeLessThan(0.02);
  });
});

describe('syllable onsets', () => {
  it('fires on a rise, not on a level held at the same loudness', () => {
    const track = createOnsetTrack(0);
    expect(track.step(0, 0)).toBe(false);
    expect(track.step(16, 0.6)).toBe(true);
    expect(track.step(32, 0.6)).toBe(false);
    expect(track.step(48, 0.62)).toBe(false);
  });

  it('will not fire twice inside the refractory window', () => {
    const track = createOnsetTrack(0);
    expect(track.step(16, 0.5)).toBe(true);
    expect(track.step(32, 0.05)).toBe(false);
    expect(track.step(48, 0.9)).toBe(false);
    expect(track.step(16 + ONSET_REFRACTORY_MS + 16, 0.9)).toBe(true);
  });
});

describe('the outline', () => {
  const ring = [
    { x: 0, y: -10 },
    { x: 10, y: 0 },
    { x: 0, y: 10 },
    { x: -10, y: 0 },
  ];

  it('closes, and emits one cubic per point', () => {
    const d = closedSpline(ring);
    expect(d.endsWith('Z')).toBe(true);
    expect(d.match(/C /g)).toHaveLength(ring.length);
  });

  it('runs open over the requested span, with no close', () => {
    const d = openSpline(ring, 1, 3);
    expect(d.includes('Z')).toBe(false);
    expect(d.match(/C /g)).toHaveLength(2);
  });

  it('refuses degenerate input rather than emitting a broken path', () => {
    expect(closedSpline([{ x: 0, y: 0 }])).toBe('');
    expect(openSpline(ring, 2, 2)).toBe('');
  });
});

describe('a commissioned character still replaces the presence', () => {
  function fakeInputs(): RiveStateMachineInput[] {
    return Object.values(RIVE_INPUTS).map((name) => ({ name, value: 0, fire: vi.fn() }));
  }

  function fakeRuntime(inputs: RiveStateMachineInput[]): RiveRuntime {
    return {
      Rive: class {
        constructor(params: RiveConstructorParams) {
          setTimeout(() => params.onLoad?.(), 0);
        }
        stateMachineInputs() {
          return inputs;
        }
        cleanup() {}
      },
    } as unknown as RiveRuntime;
  }

  it('swaps in over the presence and replays the state the tutor is already in', async () => {
    const inputs = fakeInputs();
    const byName = (name: string) => inputs.find((input) => input.name === name);
    const node = host();
    const driver = createAvatarDriver(node, {
      presence: 'presence',
      rive: { src: '/avatar/tutor.riv', loadRuntime: async () => fakeRuntime(inputs) },
    });
    expect(node.querySelector('[data-part="form"]')).not.toBeNull();

    driver.setState('speaking');
    driver.setGaze(BOARD_GAZE);
    driver.setMouth(0.4);

    await vi.waitFor(() => expect(node.querySelector('canvas')).not.toBeNull());
    expect(node.querySelector('[data-part="form"]')).toBeNull();
    expect(byName(RIVE_INPUTS.state)?.value).toBe(3);
    expect(byName(RIVE_INPUTS.gazeX)?.value).toBe(85);
    expect(byName(RIVE_INPUTS.mouth)?.value).toBe(40);
    driver.dispose();
  });
});
