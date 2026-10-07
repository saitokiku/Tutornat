/**
 * The deployment configuration of this candidate, checked against the real
 * loader rather than by eye. openmaic.yml is the only thing standing between a
 * private candidate and a request that names its own model, key or endpoint,
 * so each guarantee it is supposed to provide is asserted here.
 *
 * Offline: the loader reads the file and an injected env map; no network, no
 * credential, no server.
 */

import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  ModelConfigError,
  parseModelConfig,
  type ConfigEnv,
} from '@/lib/server/model-config/openmaic-yml';
import { MODEL_SLOTS, STAGE_SLOTS, slotLineage } from '@/lib/config/model-slots';

// Deliberately NOT at the repository root: a root openmaic.yml is picked up by
// the upstream suite's own cwd-relative loads and would break 100+ baseline
// tests. The launcher points OPENMAIC_CONFIG here instead.
const FILE = path.resolve(process.cwd(), '../delivery/fullstack/native/openmaic.yml');
const TEXT = fs.readFileSync(FILE, 'utf8');
const TOKEN = 'sk-ant-oat01-not-a-real-token';
const ENV: ConfigEnv = { ANTHROPIC_AUTH_TOKEN: TOKEN };

const config = parseModelConfig(TEXT, { file: FILE, env: ENV });
const slots = config.slots ?? {};

describe('the candidate openmaic.yml', () => {
  it('parses and cross-checks with no issues', () => {
    // parseModelConfig throws ModelConfigError on any problem, so reaching
    // here at module load is itself the assertion; restated for the record.
    expect(config).toBeTruthy();
  });

  it('refuses to start when the credential is not in the environment', () => {
    // Fail closed: no config means no server, rather than a server with an
    // empty key that produces confusing 401s at generation time.
    let thrown: unknown;
    try {
      parseModelConfig(TEXT, { file: FILE, env: {} });
    } catch (error) {
      thrown = error;
    }
    expect(thrown).toBeInstanceOf(ModelConfigError);
    expect(String((thrown as Error).message)).toContain('ANTHROPIC_AUTH_TOKEN');
  });

  it('declares exactly one provider, native Anthropic', () => {
    const providers = config.providers ?? {};
    expect(Object.keys(providers)).toEqual(['anthropic']);
    expect(providers.anthropic?.preset).toBe('anthropic');
    // No baseUrl override: the catalog default (https://api.anthropic.com/v1)
    // is the canonical endpoint. An override here would be the exfiltration hole.
    expect(providers.anthropic?.baseUrl).toBeUndefined();
    expect(providers.anthropic?.proxy).toBeUndefined();
  });

  it('refuses request-supplied models, keys and endpoints', () => {
    expect(config.policy?.allowWorkspaceProviders).toBe(false);
  });

  it('pins the chat root to claude-opus-5 at maximum supported effort', () => {
    const llm = slots.llm;
    expect(llm && typeof llm === 'object').toBe(true);
    const assignment = llm as { model?: string; thinking?: { mode?: string; effort?: string } };
    expect(assignment.model).toBe('anthropic:claude-opus-5');
    expect(assignment.thinking?.mode).toBe('enabled');
    expect(assignment.thinking?.effort).toBe('max');
  });

  it('declares max effort on every slot that can carry one', () => {
    // The owner requires maximum supported reasoning. `course.content` is the
    // slot a latency argument would attack, so it is asserted explicitly here
    // AND in native-opus-boundaries.test.ts. `agent` is the only slot allowed
    // to omit effort: it declares noThinkingEffort upstream because its calls
    // carry function tools, so an effort cannot ride along.
    for (const [slot, assignment] of Object.entries(slots)) {
      if (!assignment || typeof assignment !== 'object') continue;
      const thinking = (assignment as { thinking?: { effort?: string } }).thinking;
      if (thinking?.effort === undefined) {
        expect(slot, 'only the agent slot may omit effort').toBe('agent');
        continue;
      }
      expect(thinking.effort, slot).toBe('max');
    }
  });

  it('assigns no fallback anywhere, so a failure never reaches another model', () => {
    for (const [slot, assignment] of Object.entries(slots)) {
      if (assignment && typeof assignment === 'object') {
        expect((assignment as { fallback?: unknown }).fallback, slot).toBeUndefined();
      }
    }
  });

  it('names no model other than anthropic:claude-opus-5', () => {
    const named = Object.values(slots)
      .map((assignment) =>
        typeof assignment === 'string'
          ? assignment
          : assignment && typeof assignment === 'object'
            ? (assignment as { model?: string }).model
            : undefined,
      )
      .filter((value): value is string => typeof value === 'string');
    expect(named.length).toBeGreaterThan(0);
    expect(new Set(named)).toEqual(new Set(['anthropic:claude-opus-5']));
  });

  it('locks every non-chat capability off rather than leaving it open', () => {
    for (const capability of ['tts', 'asr', 'image', 'video', 'webSearch', 'document']) {
      expect(Object.hasOwn(slots, capability), `${capability} must be declared`).toBe(true);
      expect(slots[capability], capability).toBeNull();
    }
  });

  it('leaves no chat slot able to resolve to anything but the pinned root', () => {
    // Either a slot is assigned here, or it inherits from an ancestor that is.
    // Every chat slot's lineage ends at `llm`, which is assigned, so an
    // unassigned slot cannot fall through to a user-chosen model.
    for (const slot of MODEL_SLOTS.filter((entry) => entry.capability === 'chat')) {
      const anchored = slotLineage(slot.id).some((id) => Object.hasOwn(slots, id));
      expect(anchored, `${slot.id} resolves through an assigned ancestor`).toBe(true);
    }
  });

  it('covers every generation stage the app can call', () => {
    for (const [stage, slot] of Object.entries(STAGE_SLOTS)) {
      const anchored = slotLineage(slot).some((id) => Object.hasOwn(slots, id));
      expect(anchored, `stage ${stage} (slot ${slot})`).toBe(true);
    }
  });

  it('keeps the credential out of the file on disk', () => {
    expect(TEXT).not.toContain(TOKEN);
    expect(TEXT).not.toContain('sk-ant-');
    expect(TEXT).toContain('${ANTHROPIC_AUTH_TOKEN}');
  });
});
