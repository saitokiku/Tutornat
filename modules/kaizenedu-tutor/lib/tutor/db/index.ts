export {
  DbNotConfiguredError,
  ensureTutorSchema,
  getTutorDb,
  isDbConfigured,
  setTutorDbForTests,
  wrapPool,
} from './client';
export type { PoolLike, Queryable, QueryResultLike, TutorDb } from './client';
export { TUTOR_SCHEMA_STATEMENTS, TUTOR_TABLES } from './schema';
