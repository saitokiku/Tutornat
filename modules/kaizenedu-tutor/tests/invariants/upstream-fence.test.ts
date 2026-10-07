/**
 * Strip passes 1 and 2 (docs/MVP-REFERENCE.md §6; the strip list in
 * .claude/skills/openmaic-internals/references/strip-list.md) are one fence
 * in middleware.ts rather than deletions: while the product is on, upstream's
 * pages and API routes are not served, and nothing is removed from the tree,
 * so the weekly upstream merge stays clean. This suite pins what the fence
 * refuses, what it lets through, and that the middleware and the root layout
 * actually use it.
 */
import { existsSync } from 'node:fs';
import { join } from 'node:path';

import { NextRequest } from 'next/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { isServedInTutorMode, PRODUCT_ROUTE_PREFIXES, UPSTREAM_ROUTES_KEPT } from '@/kaizen.config';
import { middleware } from '@/middleware';

import { readRepoFile, REPO_ROOT } from './_helpers';

/** One path per upstream surface the strip list names, page or route. */
const UPSTREAM_SURFACE = [
  '/classroom/abc',
  '/workspace',
  '/workbench/new',
  '/generation-preview',
  '/eval/whiteboard',
  '/api/chat',
  '/api/agent/run',
  '/api/pbl/projects',
  '/api/export-video',
  '/api/generate-classroom',
  '/api/classroom',
  '/api/classroom-media/abc',
  '/api/provider/probe-models',
  '/api/verify-model',
  '/api/verify-image-provider',
  '/api/verify-video-provider',
  '/api/verify-pdf-provider',
  '/api/azure-voices',
  '/api/persistence/stages',
  '/api/stages/1',
  '/api/usage',
  '/api/generate/voice',
  '/api/generate/tts',
  '/api/transcription',
  '/api/parse-pdf',
  '/api/extract-document',
  '/api/skills',
  '/api/materials',
  '/api/folders',
  '/api/web-search',
  '/api/comfyui-workflows',
  '/api/proxy-media',
  '/api/quiz-grade',
  '/api/stage-meta',
  '/api/server-providers',
];

const SERVED = [
  '/',
  '/api/tutor/health',
  '/api/tutor/turn',
  '/api/parent/billing/webhook',
  '/api/health',
  '/api/access-code/status',
  '/_next/data/build/welcome.json',
  '/robots.txt',
  '/openmaic-mark.png',
  ...PRODUCT_ROUTE_PREFIXES,
];

describe('the fence: what is refused and what is served while the product is on', () => {
  it('refuses every upstream page and route the strip list names', () => {
    for (const pathname of UPSTREAM_SURFACE) {
      expect(isServedInTutorMode(pathname), `${pathname} must be fenced`).toBe(false);
    }
  });

  it('serves the product, the root, the kept upstream routes, and static files', () => {
    for (const pathname of SERVED) {
      expect(isServedInTutorMode(pathname), `${pathname} must be served`).toBe(true);
    }
    for (const prefix of UPSTREAM_ROUTES_KEPT) {
      expect(isServedInTutorMode(prefix)).toBe(true);
    }
  });

  it('a file-like name under /api/ does not slip through', () => {
    expect(isServedInTutorMode('/api/classroom-media/abc.png')).toBe(false);
    expect(isServedInTutorMode('/api/proxy-media/x.mp4')).toBe(false);
  });

  it('the list above names surfaces that exist in the tree, so it cannot go stale silently', () => {
    for (const pathname of UPSTREAM_SURFACE) {
      const [first, second] = pathname.split('/').filter(Boolean);
      const candidates =
        first === 'api'
          ? [join(REPO_ROOT, 'app', 'api', second ?? '')]
          : [join(REPO_ROOT, 'app', first ?? '')];
      expect(
        candidates.some((candidate) => existsSync(candidate)),
        `${pathname} names nothing under app/`,
      ).toBe(true);
    }
  });
});

describe('the middleware applies the fence', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  async function status(pathname: string): Promise<number> {
    const response = await middleware(new NextRequest(`http://localhost${pathname}`));
    return response.status;
  }

  it('answers 404 for upstream surfaces and passes product routes with the product on', async () => {
    vi.stubEnv('TUTOR_MODE', '1');
    vi.stubEnv('ACCESS_CODE', '');
    expect(await status('/classroom/abc')).toBe(404);
    expect(await status('/api/chat')).toBe(404);
    expect(await status('/api/server-providers')).toBe(404);
    expect(await status('/api/tutor/health')).toBe(200);
    expect(await status('/api/health')).toBe(200);
    expect(await status('/welcome')).toBe(200);
  });

  it('leaves upstream alone with the product off', async () => {
    vi.stubEnv('TUTOR_MODE', '');
    vi.stubEnv('NEXT_PUBLIC_TUTOR_MODE', '');
    vi.stubEnv('ACCESS_CODE', '');
    expect(await status('/classroom/abc')).toBe(200);
    expect(await status('/api/chat')).toBe(200);
    expect(await status('/welcome')).toBe(404);
  });

  it('the root layout mounts upstream chrome only with the product off', () => {
    const layout = readRepoFile('app/layout.tsx');
    expect(layout).toContain('const upstreamChrome = !isTutorMode();');
    for (const component of ['ServerProvidersInit', 'ProSwapWatcher', 'StorageHealthNotice']) {
      expect(layout).toContain(`{upstreamChrome && <${component} />}`);
    }
  });
});
