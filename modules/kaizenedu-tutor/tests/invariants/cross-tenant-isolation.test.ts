/**
 * Invariant (a): no request can read another account's rows through any API
 * route (CLAUDE.md; spec R6).
 *
 * Two halves. The store half runs the real owner-bound document store on
 * PGlite with two owners. Upstream deliberately exempts reads from the owner
 * check (a stage id is a share-by-link capability there); under TUTOR_MODE the
 * store's KAIZEN patch binds reads to the owner too, and the last case pins
 * that the gate is what does it, so a deploy without the flag keeps upstream's
 * behaviour and a deploy with it has no hole. The route half scans every
 * product API route for the principal import so a new route cannot ship
 * without server-derived identity.
 */
import { randomUUID } from 'node:crypto';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { validateAppScene, validateAppStage } from '@/lib/document-store/validators';
import { createOwnerBoundDocumentStore } from '@/lib/persistence/owner-bound-document-store';
import { StageAccessError } from '@/lib/persistence/stage-meta';

import { grepFiles, listFiles, PGlitePool, pglitePool } from './_helpers';

function courseDocument(id: string, name: string) {
  const now = 1_800_000_000_000;
  return {
    stage: { id, name, createdAt: now, updatedAt: now },
    scenes: [],
    outline: {
      outlines: [],
      requirement: name,
      generationComplete: false,
      createdAt: now,
      updatedAt: now,
    },
  };
}

function ownerStore(pool: PGlitePool, ownerId: string) {
  return createOwnerBoundDocumentStore({
    pool,
    ownerId,
    validateScene: validateAppScene,
    validateStage: validateAppStage,
  });
}

describe('invariant (a): cross-tenant isolation in the document store', () => {
  let pool: PGlitePool;
  const ownerA = 'acct:aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  const ownerB = 'acct:bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  let stageId: string;

  beforeEach(async () => {
    vi.resetModules();
    vi.unstubAllEnvs();
    vi.stubEnv('DATABASE_URL', `postgres://invariants-${randomUUID()}`);
    vi.stubEnv('ASSET_S3_BUCKET', '');
    vi.stubEnv('TUTOR_MODE', '1');
    pool = await pglitePool();
    // Provision every table the way the server does (runtime, document,
    // stage_meta, owner_material, asset); the owner-bound store assumes they exist.
    const { getServerPersistenceProvider } = await import('@/lib/persistence/server-provider');
    await getServerPersistenceProvider(process.env.DATABASE_URL!, () => pool as never);
    stageId = `stage-${randomUUID()}`;
    await ownerStore(pool, ownerA).saveDocument(courseDocument(stageId, 'Owner A private course'));
  });

  afterEach(async () => {
    await pool.end();
    vi.unstubAllEnvs();
  });

  it('the owner can read its own document (fixture sanity, prevents a vacuous pass)', async () => {
    const document = await ownerStore(pool, ownerA).loadDocument(stageId);
    expect(document?.stage.id).toBe(stageId);
  });

  it('another owner does not see the document in a listing', async () => {
    const listed = await ownerStore(pool, ownerB).listDocuments();
    expect(listed.map((entry) => entry.id)).not.toContain(stageId);
  });

  it('another owner cannot delete the document', async () => {
    await expect(ownerStore(pool, ownerB).deleteDocument(stageId)).rejects.toBeInstanceOf(
      StageAccessError,
    );
    const stillThere = await ownerStore(pool, ownerA).loadDocument(stageId);
    expect(stillThere?.stage.id).toBe(stageId);
  });

  it('another owner cannot read the document by id (spec R6)', async () => {
    await expect(ownerStore(pool, ownerB).loadDocument(stageId)).rejects.toBeInstanceOf(
      StageAccessError,
    );
    await expect(ownerStore(pool, ownerB).getScene(stageId, 'scene-1')).rejects.toBeInstanceOf(
      StageAccessError,
    );
  });

  it('the product gate is what binds reads: without TUTOR_MODE upstream still treats the id as a capability', async () => {
    vi.stubEnv('TUTOR_MODE', '');
    const document = await ownerStore(pool, ownerB).loadDocument(stageId);
    expect(document?.stage.id).toBe(stageId);
  });
});

describe('invariant (a): product API routes derive identity server-side', () => {
  const PRODUCT_API_ROOTS = ['app/(learner)/api', 'app/(parent)/api'] as const;

  it('every product route handler imports requirePrincipal from lib/tutor/auth/principal', () => {
    const routes = PRODUCT_API_ROOTS.flatMap((root) =>
      listFiles(root, { extensions: ['route.ts'] }),
    );
    const missing = routes.filter(
      (file) => grepFiles([file], /from '@\/lib\/tutor\/auth\/principal'/).length === 0,
    );
    expect(
      missing,
      `Product API routes without a server-derived principal (checked ${routes.length} route files)`,
    ).toEqual([]);
  });
});
