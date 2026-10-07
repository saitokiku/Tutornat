/**
 * The tutor tool inventory must not lie.
 *
 * Every tool marked `available: true` names an upstream file or route; this
 * resolves each one on disk. If upstream moves or removes a surface, this goes
 * red instead of the product quietly advertising a capability it lost.
 *
 * Also pins the owner's current sequencing: voice/podcast/flashcards/worksheets
 * are DEFERRED, and nothing may flip them to available without real wiring.
 */
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  TUTOR_TOOLS,
  availableTools,
  deferredTools,
  toolsFor,
} from '@/lib/kaizen/client/tutor-tools';

const ROOT = resolve(__dirname, '..');

describe('every available tool resolves to real upstream code', () => {
  it.each(availableTools().map((tool) => [tool.id, tool.evidence] as const))(
    '%s -> %s exists',
    (_id, evidence) => {
      expect(evidence).not.toBe('');
      // Routes are directories; modules are files. Either must exist.
      expect(existsSync(resolve(ROOT, evidence))).toBe(true);
    },
  );

  it('claims at least one tool for each objective the tutor must serve now', () => {
    for (const objective of ['explain', 'practice', 'check', 'converse', 'recall'] as const) {
      expect(toolsFor(objective).length, `no available tool for ${objective}`).toBeGreaterThan(0);
    }
  });
});

describe('deferred means deferred', () => {
  it('keeps voice, podcast, flashcards and worksheets unavailable', () => {
    const deferred = new Set(deferredTools().map((tool) => tool.id));
    for (const id of ['podcast', 'narration', 'flashcards', 'worksheet']) {
      expect(deferred.has(id), `${id} must stay deferred`).toBe(true);
    }
  });

  it('says plainly why, so nothing is silently promised', () => {
    for (const tool of deferredTools()) {
      expect(tool.note).toMatch(/DEFERRED/);
    }
  });

  it('never returns a deferred tool from a selection helper', () => {
    const selectable = (['explain', 'practice', 'check', 'converse', 'recall'] as const).flatMap(
      (objective) => [...toolsFor(objective)],
    );
    expect(selectable.every((tool) => tool.available)).toBe(true);
  });
});

describe('inventory hygiene', () => {
  it('has unique ids', () => {
    expect(new Set(TUTOR_TOOLS.map((tool) => tool.id)).size).toBe(TUTOR_TOOLS.length);
  });
});
