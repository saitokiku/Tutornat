/**
 * The planner routes (D35): add, list, update, remove, all scoped to the
 * principal's account and learner (invariant a), with the field rules.
 */
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import {
  DELETE as removeRoute,
  GET as listRoute,
  PATCH as updateRoute,
  POST as createRoute,
} from '@/app/(learner)/api/tutor/planner/route';
import { POST as guestRoute } from '@/app/(learner)/api/tutor/guest/route';
import { TUTOR_API } from '@/lib/tutor/contracts';
import { setTutorDbForTests, type TutorDb } from '@/lib/tutor/db';
import type {
  GuestStartResponse,
  ListPlannerResponse,
  PlannerItemResponse,
} from '@/lib/tutor/wire';

import { call, cookieOf } from './_api';
import { testDb } from './_db';

let db: TutorDb;
let mine: string;
let theirs: string;

async function guestCookie(address: string): Promise<string> {
  const started = await call<GuestStartResponse>(guestRoute, TUTOR_API.guest, {
    body: { level: '6-7' },
    headers: { 'x-forwarded-for': address },
  });
  if (started.status !== 201) throw new Error(`guest start failed: ${started.body.error}`);
  return cookieOf(started.headers);
}

beforeAll(async () => {
  vi.stubEnv('TUTOR_MODE', '1');
  db = await testDb();
  mine = await guestCookie('10.1.1.1');
  theirs = await guestCookie('10.1.1.2');
});

afterAll(async () => {
  await setTutorDbForTests(null);
  await db.end();
  vi.unstubAllEnvs();
});

describe('/api/tutor/planner', () => {
  it('adds, lists, updates and removes an item', async () => {
    const created = await call<PlannerItemResponse>(createRoute, TUTOR_API.planner, {
      cookie: mine,
      body: {
        title: '  Read chapter 4  ',
        subject: 'reading',
        dueOn: '2026-10-03',
        notes: 'pages 40 to 52',
      },
    });
    expect(created.status).toBe(201);
    expect(created.body.item.title).toBe('Read chapter 4');
    expect(created.body.item.dueOn).toBe('2026-10-03');
    expect(created.body.item.status).toBe('todo');

    const listed = await call<ListPlannerResponse>(listRoute, TUTOR_API.planner, { cookie: mine });
    expect(listed.status).toBe(200);
    expect(listed.body.items.map((item) => item.id)).toContain(created.body.item.id);

    const done = await call<PlannerItemResponse>(updateRoute, TUTOR_API.planner, {
      cookie: mine,
      method: 'PATCH',
      body: { id: created.body.item.id, status: 'done', dueOn: null },
    });
    expect(done.status).toBe(200);
    expect(done.body.item.status).toBe('done');
    expect(done.body.item.completedAt).not.toBeNull();
    expect(done.body.item.dueOn).toBeNull();

    const removed = await call(removeRoute, TUTOR_API.planner, {
      cookie: mine,
      method: 'DELETE',
      body: { id: created.body.item.id },
    });
    expect(removed.status).toBe(200);
    const again = await call<ListPlannerResponse>(listRoute, TUTOR_API.planner, { cookie: mine });
    expect(again.body.items.map((item) => item.id)).not.toContain(created.body.item.id);
  });

  it('orders open items by due date before done ones', async () => {
    for (const [title, dueOn] of [
      ['Later', '2026-12-01'],
      ['Soon', '2026-10-01'],
      ['Undated', null],
    ] as const) {
      const created = await call<PlannerItemResponse>(createRoute, TUTOR_API.planner, {
        cookie: mine,
        body: { title, subject: 'math', dueOn },
      });
      expect(created.status).toBe(201);
    }
    const listed = await call<ListPlannerResponse>(listRoute, TUTOR_API.planner, { cookie: mine });
    const titles = listed.body.items
      .filter((item) => item.status === 'todo')
      .map((item) => item.title);
    expect(titles.indexOf('Soon')).toBeLessThan(titles.indexOf('Later'));
    expect(titles.indexOf('Later')).toBeLessThan(titles.indexOf('Undated'));
  });

  it('never shows, changes or removes another learner’s item', async () => {
    const created = await call<PlannerItemResponse>(createRoute, TUTOR_API.planner, {
      cookie: mine,
      body: { title: 'Mine', subject: 'science' },
    });
    const id = created.body.item.id;
    const listed = await call<ListPlannerResponse>(listRoute, TUTOR_API.planner, {
      cookie: theirs,
    });
    expect(listed.body.items.map((item) => item.id)).not.toContain(id);
    const patched = await call(updateRoute, TUTOR_API.planner, {
      cookie: theirs,
      method: 'PATCH',
      body: { id, title: 'Stolen' },
    });
    expect(patched.status).toBe(404);
    const removed = await call(removeRoute, TUTOR_API.planner, {
      cookie: theirs,
      method: 'DELETE',
      body: { id },
    });
    expect(removed.status).toBe(404);
  });

  it('refuses a missing title, an unknown subject, a bad date, and a long note', async () => {
    const cases: Array<Record<string, unknown>> = [
      { title: '', subject: 'math' },
      { title: 'x', subject: 'astrology' },
      { title: 'x', subject: 'math', dueOn: '3 October' },
      { title: 'x', subject: 'math', dueOn: '2026-13-40' },
      { title: 'x', subject: 'math', notes: 'n'.repeat(501) },
    ];
    for (const body of cases) {
      const response = await call(createRoute, TUTOR_API.planner, { cookie: mine, body });
      expect(response.status, JSON.stringify(body)).toBe(400);
    }
  });

  it('needs a session', async () => {
    const response = await call(listRoute, TUTOR_API.planner, {});
    expect(response.status).toBe(401);
  });
});
