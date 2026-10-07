/**
 * Seeds `skills` from the graph and `check_items` from the reviewed bank on
 * first use of a database, once per process per database handle.
 */
import type { Queryable } from '@/lib/tutor/db';
import { createLogger } from '@/lib/logger';

import { SKILLS } from './graph';
import { loadItemBank, upsertCheckItems, type RawItem } from './items';

const log = createLogger('tutor-graph');

const seeded = new WeakMap<Queryable, Promise<void>>();

export async function seedSkills(db: Queryable): Promise<void> {
  for (const skill of SKILLS) {
    await db.query(
      `INSERT INTO skills (id, name, prereqs, tags, slice, ordinal) VALUES ($1, $2, $3::jsonb, $4::jsonb, $5, $6)
       ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, prereqs = EXCLUDED.prereqs, tags = EXCLUDED.tags,
         slice = EXCLUDED.slice, ordinal = EXCLUDED.ordinal`,
      [
        skill.id,
        skill.name,
        JSON.stringify(skill.prereqs),
        JSON.stringify(skill.tags),
        skill.slice,
        skill.ordinal,
      ],
    );
  }
}

/** Seeds the graph and whatever reviewed bank is on disk (or the given items). */
export function ensureGraphSeeded(db: Queryable, items?: readonly RawItem[]): Promise<void> {
  const existing = seeded.get(db);
  if (existing) return existing;
  const task = (async () => {
    await seedSkills(db);
    let bank = items;
    if (!bank) {
      const loaded = loadItemBank();
      if (loaded.problems.length > 0) {
        log.warn(`item bank: ${loaded.problems.length} problem(s); invalid items skipped`);
      }
      bank = loaded.valid;
    }
    const count = await upsertCheckItems(db, bank);
    log.info(`seeded ${SKILLS.length} skills and ${count} check items`);
  })();
  seeded.set(db, task);
  task.catch(() => seeded.delete(db));
  return task;
}

/** Tests only: forget that a handle was seeded. */
export function resetGraphSeedForTests(db: Queryable): void {
  seeded.delete(db);
}
