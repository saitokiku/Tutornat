/**
 * Product database access. One `pg` pool per process against DATABASE_URL
 * (Neon pooled endpoint in staging and prod); tests inject a PGlite-backed
 * pool through `setTutorDbForTests`. The schema is provisioned on first use.
 *
 * When DATABASE_URL is absent the product answers a clear "database not
 * configured" state instead of crashing: routes catch `DbNotConfiguredError`.
 */
import { Pool } from 'pg';

import { TUTOR_SCHEMA_STATEMENTS } from './schema';

export interface QueryResultLike<T> {
  rows: T[];
}

export interface Queryable {
  query<T extends Record<string, unknown> = Record<string, unknown>>(
    text: string,
    params?: unknown[],
  ): Promise<QueryResultLike<T>>;
}

export interface TutorDb extends Queryable {
  withTransaction<T>(body: (tx: Queryable) => Promise<T>): Promise<T>;
  end(): Promise<void>;
}

/** The node-postgres surface we need; PGlite pools in tests satisfy it too. */
export interface PoolLike {
  query(text: string, params?: unknown[]): Promise<{ rows: unknown[] }>;
  connect(): Promise<{
    query(text: string, params?: unknown[]): Promise<{ rows: unknown[] }>;
    release(): void;
  }>;
  end(): Promise<void>;
}

export class DbNotConfiguredError extends Error {
  readonly code = 'DB_NOT_CONFIGURED' as const;

  constructor() {
    super('DATABASE_URL is not configured; the product database is unavailable.');
    this.name = 'DbNotConfiguredError';
  }
}

const STATE_KEY = Symbol.for('natural-tutor.db');
interface DbState {
  db?: Promise<TutorDb>;
  testDb?: TutorDb | null;
  connectionString?: string;
}
const state = ((globalThis as Record<symbol, unknown>)[STATE_KEY] ??= {}) as DbState;

export function isDbConfigured(): boolean {
  return Boolean(state.testDb) || Boolean(process.env.DATABASE_URL?.trim());
}

export function wrapPool(pool: PoolLike): TutorDb {
  const query = async <T extends Record<string, unknown>>(text: string, params?: unknown[]) => {
    const result = await pool.query(text, params);
    return { rows: result.rows as T[] };
  };
  return {
    query,
    async withTransaction<T>(body: (tx: Queryable) => Promise<T>): Promise<T> {
      const client = await pool.connect();
      const tx: Queryable = {
        async query<T2 extends Record<string, unknown>>(text: string, params?: unknown[]) {
          const result = await client.query(text, params);
          return { rows: result.rows as T2[] };
        },
      };
      try {
        await client.query('BEGIN');
        const value = await body(tx);
        await client.query('COMMIT');
        return value;
      } catch (error) {
        await client.query('ROLLBACK').catch(() => undefined);
        throw error;
      } finally {
        client.release();
      }
    },
    end: () => pool.end(),
  };
}

export async function ensureTutorSchema(db: Queryable): Promise<void> {
  for (const statement of TUTOR_SCHEMA_STATEMENTS) {
    await db.query(statement);
  }
}

/** Tests only: inject a database (already provisioned or not) and bypass DATABASE_URL. */
export async function setTutorDbForTests(db: TutorDb | null, provision = true): Promise<void> {
  state.testDb = db;
  state.db = undefined;
  if (db && provision) await ensureTutorSchema(db);
}

export function getTutorDb(): Promise<TutorDb> {
  if (state.testDb) return Promise.resolve(state.testDb);
  const connectionString = process.env.DATABASE_URL?.trim();
  if (!connectionString) return Promise.reject(new DbNotConfiguredError());
  if (state.db && state.connectionString === connectionString) return state.db;
  state.connectionString = connectionString;
  const pool = new Pool({ connectionString, max: 4 });
  const db = wrapPool(pool as unknown as PoolLike);
  state.db = ensureTutorSchema(db)
    .then(() => db)
    .catch((error: unknown) => {
      state.db = undefined;
      throw error;
    });
  return state.db;
}
