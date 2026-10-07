/**
 * Exact language instruction in the real outbound payload, both locales.
 *
 * Context: a native-lane English chat probe was answered in CHINESE. Upstream
 * defaults several paths to zh-CN (`use-browser-tts.ts` defaults `lang:
 * 'zh-CN'`; `lib/i18n` carries 12 locales). This prints the verbatim
 * `requirements.requirement` this lane writes into
 * `sessionStorage.generationSession`, so the configured language in the actual
 * provider-bound payload is a recorded fact rather than an assumption.
 *
 * OFFLINE. Reads no server and makes no provider call.
 */
import { describe, expect, it } from 'vitest';

import { buildGenerationSession } from '@/lib/kaizen/client/course-request';
import type { KaizenProfile } from '@/lib/kaizen/client/profile';

const p = (lang: KaizenProfile['lang']): KaizenProfile => ({ nickname: 'Zuzu', age: 8, lang });

describe('outbound payload carries the configured language explicitly', () => {
  it.each([
    ['en-US', 'English'],
    ['es-MX', 'Spanish (Mexico)'],
  ] as const)('%s -> names %s in the payload', (lang, expected) => {
    const session = buildGenerationSession('volcanoes', p(lang), 'sess');
    const text = session.requirements.requirement;
    const line = text.split('\n').find((l) => l.startsWith('Language:'));
    console.log(`\n[payload ${lang}] ${line}`);
    expect(line).toContain(expected);
    // No Chinese default may leak in from upstream's zh-CN-defaulting helpers.
    expect(text).not.toMatch(/zh-CN|Chinese|中文/);
    // The locale must appear exactly once, so there is no competing directive.
    expect(text.split('Language:').length - 1).toBe(1);
  });

  it('never sends the other locale alongside the chosen one', () => {
    const en = buildGenerationSession('x', p('en-US'), 's').requirements.requirement;
    expect(en).not.toContain('Spanish');
    const es = buildGenerationSession('x', p('es-MX'), 's').requirements.requirement;
    // "Spanish (Mexico)" is the only language named; bare "English" must not appear.
    expect(es).not.toMatch(/\bEnglish\b/);
  });

  it('prints the full en-US payload for the record', () => {
    console.log(
      `\n===== FULL en-US requirement =====\n${
        buildGenerationSession('how volcanoes erupt', p('en-US'), 's').requirements.requirement
      }\n===== END =====`,
    );
    expect(true).toBe(true);
  });
});
