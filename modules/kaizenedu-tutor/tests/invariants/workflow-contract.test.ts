/**
 * Pins the invariants CI job so it cannot be disabled quietly, in the style
 * of tests/workflows/ci-video-export-contract.test.ts.
 */
import { readFileSync } from 'node:fs';

import yaml from 'js-yaml';
import { describe, expect, it } from 'vitest';

interface WorkflowStep {
  name?: string;
  run?: string;
  uses?: string;
  'continue-on-error'?: boolean;
  if?: string;
}

interface Workflow {
  on?: Record<string, unknown>;
  jobs?: Record<string, { steps?: WorkflowStep[]; if?: string; 'timeout-minutes'?: number }>;
}

function loadWorkflow(): Workflow {
  return yaml.load(readFileSync('.github/workflows/invariants.yml', 'utf8')) as Workflow;
}

describe('invariants workflow contract', () => {
  const workflow = loadWorkflow();
  const job = workflow.jobs?.invariants;

  it('runs on pull requests and on pushes to main', () => {
    expect(workflow.on).toHaveProperty('pull_request');
    expect(workflow.on).toHaveProperty('push');
  });

  it('has an unconditional invariants job with a time budget', () => {
    expect(job).toBeDefined();
    expect(job?.if).toBeUndefined();
    expect(job?.['timeout-minutes']).toBeGreaterThan(0);
  });

  it('runs the invariant suite, the skill validator, the copy and prompt checks, and the client-bundle audit without continue-on-error', () => {
    const steps = job?.steps ?? [];
    const runs = steps.map((step) => step.run ?? '');
    expect(runs.some((run) => run.includes('pnpm test:invariants'))).toBe(true);
    expect(runs.some((run) => run.includes('pnpm skills:validate'))).toBe(true);
    expect(runs.some((run) => run.includes('design-system/scripts/check-copy.mjs'))).toBe(true);
    expect(runs.some((run) => run.includes('tutor-loop/scripts/check-prompts.mjs'))).toBe(true);
    expect(runs.some((run) => run.includes('pnpm audit:client-bundle'))).toBe(true);
    for (const step of steps) {
      expect(
        step['continue-on-error'],
        `${step.name ?? step.run} must not continue on error`,
      ).toBeUndefined();
      expect(step.if, `${step.name ?? step.run} must be unconditional`).toBeUndefined();
    }
  });
});
