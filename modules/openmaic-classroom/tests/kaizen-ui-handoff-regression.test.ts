/**
 * Regression: the three defects from the independent spec verification
 * (ui-spec-20261003T232634Z/REPORT.md).
 *
 *   F1 — a generation started inside /kaizen must exit back to /kaizen,
 *        and an upstream generation must keep exiting to '/'.
 *   F3 — the learner's EN/ES choice must reach the shared stage/chat surfaces,
 *        not just Kaizen's own chrome.
 *
 * OFFLINE. No server, no provider, no network. `sessionStorage` is a local
 * stub; the routing assertions call the same pure function the shared
 * `/generation-preview` exits call.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

class MemoryStorage implements Storage {
  private map = new Map<string, string>();
  get length() {
    return this.map.size;
  }
  clear() {
    this.map.clear();
  }
  getItem(k: string) {
    return this.map.get(k) ?? null;
  }
  key(i: number) {
    return [...this.map.keys()][i] ?? null;
  }
  removeItem(k: string) {
    this.map.delete(k);
  }
  setItem(k: string, v: string) {
    this.map.set(k, String(v));
  }
}

vi.stubGlobal('sessionStorage', new MemoryStorage());

const {
  clearKaizenOrigin,
  isKaizenOrigin,
  markKaizenOrigin,
  takeGenerationExit,
} = await import('@/lib/kaizen/client/handoff');
const { buildGenerationSession, languageDirective } = await import(
  '@/lib/kaizen/client/course-request'
);
import type { KaizenProfile } from '@/lib/kaizen/client/profile';

const learner = (lang: KaizenProfile['lang'] = 'en-US'): KaizenProfile => ({
  nickname: 'Zuzu',
  age: 8,
  lang,
});

beforeEach(() => {
  sessionStorage.clear();
});

describe('F1 — generation exits return to the surface the learner started on', () => {
  it('completion from Kaizen lands on the Kaizen stage, not the upstream one', () => {
    markKaizenOrigin('sess-1');
    expect(takeGenerationExit('stage', { stageId: 'stg-9', sessionId: 'sess-1' })).toBe(
      '/kaizen/course/stg-9',
    );
  });

  it('cancel and error from Kaizen land on the Kaizen catalogue, not /', () => {
    markKaizenOrigin('sess-1');
    expect(takeGenerationExit('home', { sessionId: 'sess-1' })).toBe('/kaizen');
  });

  it('default upstream behaviour is unchanged when no marker was written', () => {
    expect(takeGenerationExit('stage', { stageId: 'stg-9', sessionId: 'sess-1' })).toBe(
      '/classroom/stg-9',
    );
    expect(takeGenerationExit('home', { sessionId: 'sess-1' })).toBe('/');
    expect(takeGenerationExit('home')).toBe('/');
  });

  it('a stale marker from an abandoned flow cannot capture a later generation', () => {
    markKaizenOrigin('abandoned');
    expect(takeGenerationExit('stage', { stageId: 'stg-9', sessionId: 'different' })).toBe(
      '/classroom/stg-9',
    );
  });

  it('the marker is consumed by the exit, so a second generation is unaffected', () => {
    markKaizenOrigin('sess-1');
    takeGenerationExit('stage', { stageId: 'a', sessionId: 'sess-1' });
    expect(isKaizenOrigin('sess-1')).toBe(false);
    expect(takeGenerationExit('stage', { stageId: 'b', sessionId: 'sess-1' })).toBe('/classroom/b');
  });

  it('is a fixed route token, never an arbitrary return URL (no open redirect)', () => {
    // Anything stored under the key that is not the exact literal marker is
    // ignored, so no stored string can ever become a destination.
    for (const hostile of [
      JSON.stringify({ origin: 'kaizen', sessionId: 's', next: 'https://evil.test' }),
      JSON.stringify({ origin: 'https://evil.test', sessionId: 's' }),
      '"//evil.test"',
      'https://evil.test',
      '{',
    ]) {
      sessionStorage.setItem('kaizen.generationOrigin', hostile);
      const exit = takeGenerationExit('home', { sessionId: 's' });
      expect(['/', '/kaizen']).toContain(exit);
      expect(exit.startsWith('/')).toBe(true);
      expect(exit).not.toContain('evil.test');
      expect(exit.startsWith('//')).toBe(false);
    }
  });

  it('clearKaizenOrigin drops a pending marker (cancel before handoff)', () => {
    markKaizenOrigin('sess-1');
    clearKaizenOrigin();
    expect(isKaizenOrigin('sess-1')).toBe(false);
  });
});

describe('F3 — the chosen language reaches the shared downstream surfaces', () => {
  it.each([
    ['en-US', 'English'],
    ['es-MX', 'Spanish (Mexico)'],
  ] as const)('%s session carries an explicit languageDirective', (lang, name) => {
    const session = buildGenerationSession('volcanoes', learner(lang), 'sess');
    // `languageDirective` is what upstream copies to `stage.languageDirective`,
    // which is the single input to the chat prompt's language constraint
    // (`buildLanguageConstraint`, lib/chat/pi/prompts.ts). Without it the chat
    // inherits whatever the outline model inferred.
    expect(session.languageDirective).toBeTruthy();
    expect(session.languageDirective).toContain(name);
    expect(session.languageDirective).toContain(lang);
    // Covers the chat reply explicitly, not just generated scenes.
    expect(session.languageDirective?.toLowerCase()).toContain('chat');
  });

  it('no zh-CN default leaks into the directive', () => {
    for (const lang of ['en-US', 'es-MX'] as const) {
      const d = buildGenerationSession('volcanoes', learner(lang), 's').languageDirective ?? '';
      expect(d).not.toMatch(/[\u4e00-\u9fff]/);
      expect(d).not.toContain('zh-CN');
    }
  });

  it('the directive is derived from the locale, with no covert default', () => {
    expect(languageDirective('es-MX')).not.toEqual(languageDirective('en-US'));
  });

  it('the nickname still never crosses the boundary', () => {
    const session = buildGenerationSession('volcanoes', learner('es-MX'), 's');
    const payload = JSON.stringify(session);
    expect(payload).not.toContain('Zuzu');
    expect(session.requirements.userNickname).toBeUndefined();
  });

  it('the real self-reported age guides generation, with no silent substitution', () => {
    const text = buildGenerationSession('volcanoes', { ...learner(), age: 41 }, 's').requirements
      .requirement;
    expect(text).toContain('Age: 41');
    const stated = buildGenerationSession('volcanoes', { ...learner(), age: null }, 's')
      .requirements.requirement;
    expect(stated).toContain('Age: not stated');
    expect(stated).not.toMatch(/Age: \d/);
  });
});
