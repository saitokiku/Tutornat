/**
 * Checks for the Kaizen surface's only non-trivial logic: the outbound privacy
 * boundary, the age hint, and stale-result rejection. The components are
 * composition over upstream primitives and are not unit-tested here.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  AGE_BANDS,
  bandForAge,
  DEFAULT_PROFILE,
  loadProfile,
  normalizeAge,
  profileReady,
  saveProfile,
  type KaizenProfile,
} from '@/lib/kaizen/client/profile';
import {
  buildGenerationSession,
  buildRequirements,
  seedById,
  TOPIC_SEEDS,
} from '@/lib/kaizen/client/course-request';
import { createLatestGate } from '@/lib/kaizen/client/stale';
import { strings, UI } from '@/lib/kaizen/client/strings';

/**
 * In-memory `localStorage`.
 *
 * Not jsdom: `jsdom` is not installed in this workspace (upstream's own
 * localStorage-backed tests fail on that today), and adding a devDependency is
 * not this lane's to make. A Map is also the more honest subject here — what is
 * under test is this module's parse/clamp/fallback behaviour, not a DOM
 * storage implementation.
 */
function stubLocalStorage() {
  const map = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
    removeItem: (k: string) => void map.delete(k),
    clear: () => map.clear(),
  });
  return map;
}

beforeEach(() => stubLocalStorage());

const NICK = 'Zuzu';
const profile = (over: Partial<KaizenProfile> = {}): KaizenProfile => ({
  nickname: NICK,
  age: 8,
  lang: 'en-US',
  ...over,
});

describe('nickname never leaves the device', () => {
  it('is absent from every string and field of the generation request', () => {
    const req = buildRequirements('volcanoes', profile());
    // The whole serialized request, not just the fields we remembered to check:
    // a new personalization field upstream cannot quietly start carrying it.
    expect(JSON.stringify(req)).not.toContain(NICK);
    expect(req.userNickname).toBeUndefined();
    expect(req.userBio).toBeUndefined();
  });

  it('is absent from the full session written to sessionStorage', () => {
    const session = buildGenerationSession('volcanoes', profile(), 'sess-1');
    expect(JSON.stringify(session)).not.toContain(NICK);
  });

  it('still reaches local storage, because that is its only home', () => {
    saveProfile(profile());
    expect(loadProfile().nickname).toBe(NICK);
  });
});

describe('requirement text — the three boundaries stay separate', () => {
  it('labels knowledge, instruction and learner state as distinct sections', () => {
    const text = buildRequirements('fractions', profile()).requirement;
    const knowledge = text.indexOf('KNOWLEDGE');
    const instruction = text.indexOf('INSTRUCTION');
    const learner = text.indexOf('LEARNER STATE');
    expect(knowledge).toBeGreaterThanOrEqual(0);
    expect(instruction).toBeGreaterThan(knowledge);
    expect(learner).toBeGreaterThan(instruction);
  });

  it('puts the subject in the knowledge section, not the learner section', () => {
    const text = buildRequirements('photosynthesis', profile()).requirement;
    const subject = text.slice(text.indexOf('KNOWLEDGE'), text.indexOf('INSTRUCTION'));
    expect(subject).toContain('photosynthesis');
  });

  it('carries the self-reported age as an unverified pacing hint', () => {
    const text = buildRequirements('fractions', profile({ age: 42 })).requirement;
    expect(text).toContain('42');
    expect(text).toMatch(/self-reported and unverified/i);
    // Age must not be read as ability — that is the whole premise of the surface.
    expect(text).toMatch(/never to assume reading ability/i);
  });

  it('says so when no age was given rather than inventing one', () => {
    const text = buildRequirements('fractions', profile({ age: null })).requirement;
    expect(text).toMatch(/Age: not stated/i);
    expect(text).not.toMatch(/Age: \d/);
  });

  it('forbids inventing learner history or unproven mastery', () => {
    const text = buildRequirements('fractions', profile()).requirement;
    expect(text).toMatch(/do not invent prior performance/i);
    expect(text).toMatch(/mastery that has not been demonstrated/i);
  });
});

describe('teaching directive — lesson quality before representation', () => {
  const text = buildRequirements('fractions', profile()).requirement;

  it('demands correctness first', () => {
    expect(text).toMatch(/Correctness first/i);
    expect(text.indexOf('Correctness first')).toBeLessThan(text.indexOf('Represent the idea'));
  });

  it('demands one explanatory sequence, not a list of facts', () => {
    expect(text).toMatch(/one explanatory sequence/i);
    expect(text).toMatch(/not present a list of loosely related facts/i);
  });

  it('ties each scene to a teaching objective rather than a modality', () => {
    expect(text).toMatch(/teaching objective/i);
    expect(text).toMatch(/not the one that looks most impressive/i);
  });

  it('requires a worked example and a real misconception', () => {
    expect(text).toMatch(/worked? .{0,30}example/i);
    expect(text).toMatch(/misconception/i);
  });

  it('places understanding checks where errors happen, not after every sentence', () => {
    expect(text).toMatch(/easy to get wrong/i);
    expect(text).toMatch(/[Nn]ot after every sentence/);
  });

  it('keeps text as support and still bans the known slop patterns', () => {
    expect(text).toMatch(/text supports the visual/i);
    expect(text).toMatch(/generic dots/i);
    expect(text).toMatch(/do not set prose as an image/i);
  });

  it('requests no spoken delivery — voice/podcasts are deferred, text is the fallback', () => {
    // Audio is a later deliverable. The directive must not ask the generator
    // for narration, speech or a podcast, or the lesson would depend on a
    // modality this build does not ship.
    expect(text).not.toMatch(/narrat|\bspeak\b|spoken|\bpodcast|read aloud|voice-?over|\baudio\b/i);
    // Text is still explicitly present as the accessible fallback.
    expect(text).toMatch(/labels, captions/i);
  });

  it('pins narration language to the chosen locale', () => {
    expect(buildRequirements('x', profile({ lang: 'es-MX' })).requirement).toContain('Spanish');
    expect(buildRequirements('x', profile({ lang: 'en-US' })).requirement).toContain('English');
  });

  it('refuses an empty topic instead of generating something arbitrary', () => {
    expect(() => buildRequirements('   ', profile())).toThrow(/topic is required/i);
  });

  it('runs through the upstream interactive generation path', () => {
    expect(buildRequirements('x', profile()).interactiveMode).toBe(true);
  });
});

describe('age input', () => {
  it('accepts a plausible typed age and rejects the rest', () => {
    expect(normalizeAge('8')).toBe(8);
    expect(normalizeAge(8.9)).toBe(8);
    expect(normalizeAge('0')).toBeNull();
    expect(normalizeAge('900')).toBeNull();
    expect(normalizeAge('')).toBeNull();
    expect(normalizeAge('eight')).toBeNull();
    expect(normalizeAge(undefined)).toBeNull();
  });

  it('maps every band to itself and covers the accepted range with no gaps', () => {
    for (const band of AGE_BANDS) {
      expect(bandForAge(band.report)).toBe(band.id);
      expect(bandForAge(band.min)).toBe(band.id);
      expect(bandForAge(band.max)).toBe(band.id);
    }
    for (let age = 3; age <= 120; age++) {
      expect(bandForAge(age), `age ${age} has no band`).not.toBeNull();
    }
    expect(bandForAge(null)).toBeNull();
  });

  it('gates starting on age, not on a nickname', () => {
    expect(profileReady(profile({ age: 8, nickname: '' }))).toBe(true);
    expect(profileReady(profile({ age: null }))).toBe(false);
  });
});

describe('local profile storage', () => {
  it('falls back to defaults on absent or corrupt data instead of throwing', () => {
    expect(loadProfile()).toEqual(DEFAULT_PROFILE);
    localStorage.setItem('kaizen.learner.v1', '{not json');
    expect(loadProfile()).toEqual(DEFAULT_PROFILE);
  });

  it('drops an out-of-range age and an unsupported language on read', () => {
    localStorage.setItem(
      'kaizen.learner.v1',
      JSON.stringify({ nickname: 'a', age: 999, lang: 'de-DE' }),
    );
    expect(loadProfile()).toEqual({ nickname: 'a', age: null, lang: 'en-US' });
  });
});

describe('stale-result gate', () => {
  it('keeps the newest claim and drops every superseded one', () => {
    const gate = createLatestGate();
    const first = gate.begin();
    expect(first()).toBe(true);
    const second = gate.begin();
    expect(first()).toBe(false);
    expect(second()).toBe(true);
  });

  it('invalidates outstanding claims on cancelAll (unmount)', () => {
    const gate = createLatestGate();
    const claim = gate.begin();
    gate.cancelAll();
    expect(claim()).toBe(false);
  });
});

describe('topic seeds and strings', () => {
  it('has a unique id, an icon and both languages for every seed', () => {
    expect(new Set(TOPIC_SEEDS.map((s) => s.id)).size).toBe(TOPIC_SEEDS.length);
    for (const seed of TOPIC_SEEDS) {
      expect(seed.icon.length).toBeGreaterThan(0);
      expect(seed.label['en-US'].length).toBeGreaterThan(0);
      expect(seed.label['es-MX'].length).toBeGreaterThan(0);
      expect(seedById(seed.id)).toBe(seed);
    }
    expect(seedById('nope')).toBeUndefined();
  });

  it('translates every English key, so no locale falls back to a blank label', () => {
    const en = Object.keys(UI['en-US']).sort();
    const es = Object.keys(UI['es-MX']).sort();
    expect(es).toEqual(en);
    expect(Object.keys(strings('es-MX').bands).sort()).toEqual(
      AGE_BANDS.map((b) => b.id).sort(),
    );
  });
});
