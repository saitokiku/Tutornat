/**
 * The public surface after D35: no sign-in, sign-up, trial or price anywhere
 * a visitor without a cookie can see, and a guest's navigation has no parent
 * or account items. The landing page and the public shell are read as
 * source, comments stripped, the way the claims scanner reads them.
 */
import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { PRODUCT_ROUTES } from '@/lib/tutor/contracts';

import { navFor } from '@/components/tutor/shell/nav';

const REPO_ROOT = process.cwd();

const PUBLIC_SURFACES = [
  'components/tutor/marketing/landing.tsx',
  'components/tutor/shell/public-shell.tsx',
  'components/tutor/learn/guest-start.tsx',
  'app/(learner)/welcome/page.tsx',
];

function rendered(file: string): string {
  return readFileSync(`${REPO_ROOT}/${file}`, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:\\])\/\/.*$/gm, '$1');
}

describe('the public surface for a guest', () => {
  for (const file of PUBLIC_SURFACES) {
    it(`${file} links to no sign-in, sign-up, pricing, trial or billing`, () => {
      const source = rendered(file);
      expect(source).not.toMatch(/PRODUCT_ROUTES\.(signIn|signUp)/);
      expect(source).not.toMatch(/\/sign-(in|up)/);
      expect(source).not.toMatch(/#pricing|\bpricing\b|free trial|\btrial\b|\bbilling\b/i);
      expect(source).not.toMatch(/\$\d/);
      expect(source).not.toMatch(/\bPLAN\b/);
    });
  }

  it('the landing page carries the sections the shell links to, and the start form', () => {
    const landing = rendered('components/tutor/marketing/landing.tsx');
    for (const id of ['how-it-works', 'subjects', 'privacy', 'faq']) {
      expect(landing).toContain(`id="${id}"`);
    }
    const shell = rendered('components/tutor/shell/public-shell.tsx');
    for (const id of ['how-it-works', 'subjects', 'privacy', 'faq', 'start']) {
      expect(shell).toContain(`#${id}`);
    }
    expect(rendered('components/tutor/learn/guest-start.tsx')).toContain('id="start"');
  });

  it('never types the free minutes or the retention window; both come from the configuration', () => {
    const landing = rendered('components/tutor/marketing/landing.tsx');
    const start = rendered('components/tutor/learn/guest-start.tsx');
    expect(landing).toContain('retentionDays');
    expect(start).toContain('dailyMinutes');
    expect(`${landing}${start}`).not.toMatch(/\b(120|30) (minutes|days)\b/);
  });
});

describe('navigation for a guest', () => {
  it('lists the sections of the learner page and nothing for a parent or an account', () => {
    const items = navFor('learner', 'learner', true);
    expect(items.map((item) => item.label)).toEqual(['Learn', 'Planner', 'Homework', 'Progress']);
    expect(items.map((item) => item.href)).toEqual([
      PRODUCT_ROUTES.learn,
      `${PRODUCT_ROUTES.learn}#planner`,
      `${PRODUCT_ROUTES.learn}#coursework`,
      `${PRODUCT_ROUTES.learn}#progress`,
    ]);
    expect(items.some((item) => item.href.startsWith(PRODUCT_ROUTES.parent))).toBe(false);
  });

  it('keeps the parent and account items for the accounts that have them', () => {
    expect(navFor('learner', 'parent').map((item) => item.label)).toContain('Parent');
    expect(navFor('learner', 'adult').map((item) => item.label)).toContain('Account');
    expect(navFor('learner', 'learner').map((item) => item.label)).toEqual([
      'Learn',
      'Planner',
      'Homework',
      'Progress',
    ]);
    // A guest is never given the parent items, whatever the role says.
    expect(navFor('learner', 'parent', true).map((item) => item.label)).not.toContain('Parent');
  });
});
