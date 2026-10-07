import type { Frame, Page } from '@playwright/test';
import { test, expect } from '../fixtures/base';
import { defaultTheme } from '../fixtures/test-data/scene-content';

// KAIZEN: a static asset outside the middleware matcher, served on the app's origin.
// Its document runs no application code, which is what the seed needs (see below).
const SEED_HOST_PATH = '/logos/openai.svg';
const TEST_STAGE_ID = 'e2e-video-thumbnail-stage';
const VIDEO_MEDIA_REF = 'gen_vid_thumbnail';
const LEGACY_STAGE_ID = 'e2e-legacy-video-ref-stage';
const LEGACY_VIDEO_REF = 'gen_vid_1';
const UNIQUE_VIDEO_REF = 'gen_vid_unique_legacy';
const FAILED_EXACT_STAGE_ID = 'e2e-failed-exact-video-ref-stage';
const OTHER_VIDEO_REF = 'gen_vid_other_success';
const POSTER_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=';

async function seedVideoThumbnailStage({
  page,
  stageId = TEST_STAGE_ID,
  courseName = 'Video Thumbnail Course',
  slideMediaRef = VIDEO_MEDIA_REF,
  storedMediaRef = slideMediaRef,
  storedError,
  extraStoredMediaRefs = [],
}: {
  page: Page;
  stageId?: string;
  courseName?: string;
  slideMediaRef?: string;
  storedMediaRef?: string;
  storedError?: string;
  extraStoredMediaRefs?: string[];
}) {
  // KAIZEN: the app has to create 'MAIC-Database' (Dexie, version 17) before the seed
  // can write its 'mediaFiles' store, so load the home page once and wait until that
  // database opens WITH the store. `networkidle` alone can fire before hydration, and
  // `indexedDB.databases()` lists version 17 while Dexie's upgrade transaction is still
  // running; leaving the page at that moment aborts the upgrade, the database vanishes,
  // and the seed then created an empty version-1 database and threw NotFoundError
  // inside an IndexedDB callback (CI runs of #60, reproduced from the trace).
  await page.goto('/', { waitUntil: 'networkidle' });
  await page.waitForFunction(
    async () => {
      const databases = await indexedDB.databases();
      if (!databases.some((db) => db.name === 'MAIC-Database' && (db.version ?? 0) >= 17)) {
        return false;
      }
      return new Promise<boolean>((resolve) => {
        const request = indexedDB.open('MAIC-Database');
        // Never create the database from here: abort if it turned out not to exist.
        request.onupgradeneeded = () => request.transaction?.abort();
        request.onsuccess = () => {
          const db = request.result;
          const ready = db.objectStoreNames.contains('mediaFiles');
          db.close();
          resolve(ready);
        };
        request.onerror = () => resolve(false);
        request.onblocked = () => resolve(false);
      });
    },
    undefined,
    { timeout: 30_000 },
  );

  // KAIZEN: seed from a same-origin document that runs none of the app's code. On the
  // home page the seeding evaluate still ended with "Execution context was destroyed"
  // on CI after the wait above, on every attempt, with no trace reachable from the
  // seat that had to fix it. IndexedDB is per origin, so a static asset's document
  // reaches the same databases with nothing running beside the seed; the error, if it
  // ever happens again, names the navigations seen while the seed ran.
  await page.goto(SEED_HOST_PATH);
  const navigations: string[] = [];
  const onNavigated = (frame: Frame) => {
    if (frame === page.mainFrame()) navigations.push(frame.url());
  };
  page.on('framenavigated', onNavigated);
  try {
    await seedDatabases(page, {
      stageId,
      courseName,
      slideMediaRef,
      storedMediaRef,
      storedError,
      extraStoredMediaRefs,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const seen = navigations.length ? navigations.join(', ') : 'none';
    throw new Error(`${message} (navigations during the seed: ${seen})`);
  } finally {
    page.off('framenavigated', onNavigated);
  }

  await page.goto('/', { waitUntil: 'networkidle' });
}

async function seedDatabases(
  page: Page,
  {
    stageId,
    courseName,
    slideMediaRef,
    storedMediaRef,
    storedError,
    extraStoredMediaRefs,
  }: {
    stageId: string;
    courseName: string;
    slideMediaRef: string;
    storedMediaRef: string;
    storedError?: string;
    extraStoredMediaRefs: string[];
  },
) {
  await page.evaluate(
    ({
      stageId,
      courseName,
      slideMediaRef,
      storedMediaRef,
      storedError,
      extraStoredMediaRefs,
      posterBase64,
      theme,
    }) => {
      return new Promise<void>((resolve, reject) => {
        const request = indexedDB.open('MAIC-Database');

        // KAIZEN: a failed open, a missing database, or a throw inside a callback
        // rejects instead of hanging the evaluate until the test times out.
        request.onerror = () => reject(request.error);
        request.onblocked = () => reject(new Error('MAIC-Database open was blocked'));
        request.onupgradeneeded = () => {
          request.transaction?.abort();
          reject(new Error('MAIC-Database did not exist when the seed ran'));
        };
        request.onsuccess = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          let tx: IDBTransaction;
          try {
            tx = db.transaction(['mediaFiles'], 'readwrite');
          } catch (error) {
            db.close();
            reject(error);
            return;
          }
          tx.onerror = () => reject(tx.error);
          const now = Date.now();
          const videoBytes = new Uint8Array([
            0, 0, 0, 24, 102, 116, 121, 112, 109, 112, 52, 50, 0, 0, 0, 0, 109, 112, 52, 50, 105,
            115, 111, 109,
          ]);
          const posterBytes = Uint8Array.from(atob(posterBase64), (char) => char.charCodeAt(0));
          const videoBlob = new Blob([videoBytes], { type: 'video/mp4' });
          const posterBlob = new Blob([posterBytes], { type: 'image/png' });
          const failedVideoBlob = new Blob([], { type: 'video/mp4' });

          const putVideoRecord = (mediaRef: string, error?: string) => {
            const blob = error ? failedVideoBlob : videoBlob;
            tx.objectStore('mediaFiles').put({
              id: `${stageId}:${mediaRef}`,
              stageId,
              type: 'video',
              blob,
              mimeType: 'video/mp4',
              size: blob.size,
              poster: error ? undefined : posterBlob,
              prompt: 'A generated classroom video preview',
              params: '{}',
              error,
              createdAt: now,
            });
          };

          const documentScene = {
            id: 'scene-video-thumbnail',
            stageId,
            type: 'slide',
            title: 'Video preview',
            order: 0,
            content: {
              type: 'slide',
              canvas: {
                id: 'slide-video-thumbnail',
                viewportSize: 1000,
                viewportRatio: 0.5625,
                theme,
                background: { type: 'solid', color: '#111827' },
                elements: [
                  {
                    id: 'video-el',
                    type: 'video',
                    src: slideMediaRef,
                    mediaRef: slideMediaRef,
                    left: 0,
                    top: 0,
                    width: 1000,
                    height: 562.5,
                    rotate: 0,
                    autoplay: false,
                  },
                ],
              },
            },
            createdAt: now,
            updatedAt: now,
          };

          putVideoRecord(storedMediaRef, storedError);
          for (const mediaRef of extraStoredMediaRefs) {
            putVideoRecord(mediaRef);
          }

          tx.oncomplete = () => {
            db.close();
            const documentRequest = indexedDB.open('maic-documents', 1);
            documentRequest.onupgradeneeded = () => {
              const documentDb = documentRequest.result;
              documentDb.createObjectStore('stages', { keyPath: 'id' });
              const scenes = documentDb.createObjectStore('scenes', {
                keyPath: ['stageId', 'id'],
              });
              scenes.createIndex('by-stage', 'stageId');
              documentDb.createObjectStore('outlines', { keyPath: 'stageId' });
            };
            documentRequest.onsuccess = () => {
              const documentDb = documentRequest.result;
              const documentTx = documentDb.transaction(
                ['stages', 'scenes', 'outlines'],
                'readwrite',
              );
              documentTx.objectStore('stages').put({
                id: stageId,
                name: courseName,
                description: '',
                language: 'en-US',
                style: 'professional',
                createdAt: now,
                updatedAt: now,
                dslVersion: '0.1.0',
              });
              documentTx.objectStore('scenes').put(documentScene);
              documentTx.objectStore('outlines').put({
                stageId,
                outline: { outlines: [], createdAt: now, updatedAt: now },
              });
              documentTx.oncomplete = () => {
                documentDb.close();
                resolve();
              };
              documentTx.onerror = () => reject(documentTx.error);
            };
            documentRequest.onerror = () => reject(documentRequest.error);
          };
          tx.onerror = () => reject(tx.error);
        };

        request.onerror = () => reject(request.error);
      });
    },
    {
      stageId,
      courseName,
      slideMediaRef,
      storedMediaRef,
      storedError,
      extraStoredMediaRefs,
      posterBase64: POSTER_BASE64,
      theme: defaultTheme,
    },
  );
}

test.describe('Home recent video thumbnails', () => {
  test('renders generated video thumbnails and opens the card from the preview area', async ({
    page,
  }) => {
    await seedVideoThumbnailStage({ page });

    const card = page.locator('.group.cursor-pointer').filter({
      hasText: 'Video Thumbnail Course',
    });
    const video = card.locator('[data-video-element] video');

    await expect(video).toBeVisible({ timeout: 10_000 });
    await expect(video).toHaveAttribute('src', /^blob:/);
    await expect(video).toHaveAttribute('poster', /^blob:/);
    await expect(video).not.toHaveAttribute('controls', '');
    await expect(card.locator('[data-testid="thumbnail-video-indicator"]')).toBeVisible();

    await card.click({ position: { x: 24, y: 24 } });
    await page.waitForURL(`**/classroom/${TEST_STAGE_ID}`);

    const classroomVideo = page.locator('[data-video-element] video[controls]');
    await expect(classroomVideo).toHaveCount(1);
    await expect(classroomVideo).toBeVisible({ timeout: 10_000 });
    await expect(classroomVideo).toHaveAttribute('src', /^blob:/);
  });

  test('falls back from legacy gen_vid_1 refs to the single stored video media file', async ({
    page,
  }) => {
    await seedVideoThumbnailStage({
      page,
      stageId: LEGACY_STAGE_ID,
      courseName: 'Legacy Video Ref Course',
      slideMediaRef: LEGACY_VIDEO_REF,
      storedMediaRef: UNIQUE_VIDEO_REF,
    });

    const card = page.locator('.group.cursor-pointer').filter({
      hasText: 'Legacy Video Ref Course',
    });
    const thumbnailVideo = card.locator('[data-video-element] video');

    await expect(thumbnailVideo).toBeVisible({ timeout: 10_000 });
    await expect(thumbnailVideo).toHaveAttribute('src', /^blob:/);
    await expect(card.locator('[data-testid="thumbnail-video-indicator"]')).toBeVisible();

    await card.click({ position: { x: 24, y: 24 } });
    await page.waitForURL(`**/classroom/${LEGACY_STAGE_ID}`);

    const classroomVideo = page.locator('[data-video-element] video[controls]');
    await expect(classroomVideo).toHaveCount(1);
    await expect(classroomVideo).toBeVisible({ timeout: 10_000 });
    await expect(classroomVideo).toHaveAttribute('src', /^blob:/);
  });

  test('does not fall back to another video when the exact legacy ref failed', async ({ page }) => {
    await seedVideoThumbnailStage({
      page,
      stageId: FAILED_EXACT_STAGE_ID,
      courseName: 'Failed Exact Video Ref Course',
      slideMediaRef: LEGACY_VIDEO_REF,
      storedMediaRef: LEGACY_VIDEO_REF,
      storedError: 'Generation failed',
      extraStoredMediaRefs: [OTHER_VIDEO_REF],
    });

    const card = page.locator('.group.cursor-pointer').filter({
      hasText: 'Failed Exact Video Ref Course',
    });

    await expect(card.locator('[data-testid="thumbnail-video-indicator"]')).toBeVisible();
    await expect(card.locator('[data-video-element] video')).toHaveCount(0);
  });
});
