/**
 * Two gates that protect children, both found by checking the policy drafts
 * against the code rather than by reading the code alone.
 *
 * 1. Age banding. We collect a birth year, not a date, so a learner's real age
 *    is either `year - birthYear` or one less. Taking the difference directly
 *    banded a 12-year-old with a late birthday as a teen for up to eleven
 *    months a year, which routes a child past the under-13 consent gate.
 *
 * 2. Superseded upstream routes. Upstream's media and document routes take a
 *    provider key and base URL from the request body and check no session.
 *    The middleware's header strip cannot reach a form field, and none of them
 *    sit under a product prefix, so with the product on they were reachable by
 *    anyone.
 */
import { describe, expect, it } from 'vitest';

import { ageBandForBirthYear, isProductPath } from '@/kaizen.config';
import { bandForBirthYear } from '@/lib/tutor/client/bands';

import { readRepoFile } from './_helpers';

const JAN = new Date(Date.UTC(2026, 0, 1));
const DEC = new Date(Date.UTC(2026, 11, 31));

describe('age banding resolves to the youngest age the birth year allows', () => {
  it('never bands a learner who might still be 12 as a teen', () => {
    // Born any time in 2013: on 2026-01-01 they are 12 until their birthday.
    expect(ageBandForBirthYear(2013, JAN)).toBe('9-12');
    // Even at the end of the year the year alone cannot prove they turned 13.
    expect(ageBandForBirthYear(2013, DEC)).toBe('9-12');
  });

  it('still bands clearly-under-13 and clearly-adult learners correctly', () => {
    expect(ageBandForBirthYear(2014, JAN)).toBe('9-12');
    expect(ageBandForBirthYear(2018, JAN)).toBe('4-8');
    expect(ageBandForBirthYear(2007, JAN)).toBe('adult');
    expect(ageBandForBirthYear(1990, JAN)).toBe('adult');
  });

  it('refuses a birth year too young to have a profile at all', () => {
    expect(ageBandForBirthYear(2023, JAN)).toBeNull();
  });

  it('the client rule matches the server rule exactly', () => {
    for (let birthYear = 1985; birthYear <= 2024; birthYear += 1) {
      for (const now of [JAN, DEC]) {
        expect(bandForBirthYear(birthYear, now), `birth year ${birthYear}`).toBe(
          ageBandForBirthYear(birthYear, now),
        );
      }
    }
  });
});

describe('upstream routes that take credentials from the body are closed', () => {
  const SUPERSEDED = [
    '/api/transcription',
    '/api/generate/tts',
    '/api/parse-pdf',
    '/api/extract-document',
  ];

  it('the middleware closes each one while the product is on', () => {
    const middleware = readRepoFile('middleware.ts');
    for (const route of SUPERSEDED) {
      expect(middleware, `${route} must be closed under TUTOR_MODE`).toContain(`'${route}'`);
    }
    expect(middleware).toContain('SUPERSEDED_UPSTREAM_ROUTES');
  });

  it('none of them is covered by a product prefix, which is why the list is needed', () => {
    // If one of these ever moves under a product prefix the gate above becomes
    // redundant rather than wrong, but the list should then be trimmed.
    for (const route of SUPERSEDED) {
      expect(isProductPath(route), `${route} is not under a product prefix`).toBe(false);
    }
  });

  it('the product ships an authenticated replacement for each', () => {
    for (const replacement of [
      'app/(learner)/api/tutor/asr/route.ts',
      'app/(learner)/api/tutor/tts/route.ts',
      'app/(learner)/api/tutor/problem-extract/route.ts',
    ]) {
      expect(readRepoFile(replacement)).toContain("from '@/lib/tutor/auth/principal'");
    }
  });
});
