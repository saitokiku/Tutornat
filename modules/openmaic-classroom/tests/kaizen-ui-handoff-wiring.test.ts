/**
 * Regression: the seams that are wiring, not pure functions.
 *
 * These assert on source, deliberately — the defects were *missing calls*, and
 * a unit test of a helper nobody invokes proves nothing. Rendering the real
 * preview page in jsdom would need the whole generation stack stubbed, which
 * tests the stub. Checking that the shared exits route through the helper, and
 * that the one locale bridge exists where every Kaizen page reaches it, is the
 * smallest check that actually fails when the wiring is removed.
 *
 * OFFLINE. Reads files only.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = join(__dirname, '..');
const read = (p: string) => readFileSync(join(root, p), 'utf8');

describe('F1 wiring — the shared preview page has no hardcoded exit left', () => {
  const page = read('app/generation-preview/page.tsx');

  it('all three exits go through takeGenerationExit', () => {
    expect(page).toContain("from '@/lib/kaizen/client/handoff'");
    // completion, cancel/back, session-not-found
    expect(page.match(/takeGenerationExit\(/g)?.length ?? 0).toBeGreaterThanOrEqual(3);
  });

  it('no exit pushes a hardcoded surface route any more', () => {
    expect(page).not.toMatch(/router\.push\(`\/classroom\/\$\{stage\.id\}`\)/);
    expect(page).not.toMatch(/router\.push\('\/'\)/);
  });

  it('NewCourseFlow marks the origin when it writes the session', () => {
    const flow = read('components/kaizen/NewCourseFlow.tsx');
    expect(flow).toContain('markKaizenOrigin(sessionId)');
    // Same id in both, or the marker could never match.
    expect(flow).toContain('buildGenerationSession(topic, profile, sessionId)');
  });
});

describe('F2 wiring — the busy state has an escape', () => {
  const flow = read('components/kaizen/NewCourseFlow.tsx');

  it('offers a cancel that clears busy and the pending handoff', () => {
    expect(flow).toMatch(/const cancel = \(\) =>/);
    expect(flow).toContain('clearKaizenOrigin()');
    expect(flow).toContain('setBusy(false)');
    expect(flow).toContain('onClick={cancel}');
    expect(flow).toContain('t.cancelBusy');
  });

  it('the cancel affordance is localized in both languages', () => {
    const strings = read('lib/kaizen/client/strings.ts');
    expect(strings.match(/cancelBusy:/g)?.length).toBe(2);
  });
});

describe('F3 wiring — one bridge into upstream i18n', () => {
  it('useKaizenProfile syncs profile.lang into the upstream locale', () => {
    const hook = read('components/kaizen/use-kaizen-profile.ts');
    expect(hook).toContain("from '@/lib/hooks/use-i18n'");
    expect(hook).toContain('setLocale(profile.lang)');
  });

  it('every Kaizen surface reaches that bridge, including the stage route', () => {
    // The stage has no KaizenShell, so a bridge placed in the shell alone would
    // leave the stage (and its chat chrome) on the upstream default.
    for (const file of [
      'components/kaizen/KaizenShell.tsx',
      'app/kaizen/course/[id]/page.tsx',
    ]) {
      expect(read(file)).toContain('useKaizenProfile');
    }
  });

  it('both Kaizen locales exist upstream, so this is wiring not translation', () => {
    for (const locale of ['en-US', 'es-MX']) {
      expect(() => read(`lib/i18n/locales/${locale}.json`)).not.toThrow();
    }
  });

  it('the preview page prefers a caller-supplied directive over the inferred one', () => {
    expect(read('app/generation-preview/page.tsx')).toContain(
      'currentSession.languageDirective || outlineResult.languageDirective',
    );
  });

  it('the chat prompt consumes stage.languageDirective (the seam being fed)', () => {
    expect(read('lib/chat/pi/prompts.ts')).toContain(
      'buildLanguageConstraint(body.storeState.stage?.languageDirective)',
    );
  });
});
