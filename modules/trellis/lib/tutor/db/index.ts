/**
 * The query surface the engine closure needs. KaizenEdu's `lib/tutor/db/client.ts`
 * (pg pool, schema provisioning, PGlite test injection) is excluded: this
 * repository has no database driver dependency yet. Tests supply a thin
 * adapter (tests/engine/harness/sqlite-db.cjs); the PostgreSQL schema and
 * migration runner remain implementation work (db/README.md).
 */
export interface QueryResultLike<T> {
  rows: T[];
}

export interface Queryable {
  query<T extends Record<string, unknown> = Record<string, unknown>>(
    text: string,
    params?: unknown[],
  ): Promise<QueryResultLike<T>>;
}
