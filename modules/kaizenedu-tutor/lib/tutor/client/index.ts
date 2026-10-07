/**
 * Browser-side client for the product API. Screens import from here; the
 * shapes come from lib/tutor/wire.ts and the paths from lib/tutor/contracts.ts.
 */
export * as auth from './auth';
export * as tutorApi from './tutor';
export * as parentApi from './parent';
export * as guestApi from './guest';
export * as plannerApi from './planner';
export {
  buildQuery,
  classifyFailure,
  client,
  createClient,
  isNotConfigured,
  NETWORK_MESSAGE,
  NOT_CONFIGURED_MESSAGE,
  networkFailure,
  OFFLINE_MESSAGE,
  offlineFailure,
  parseApiBody,
  signInUrlFor,
  unauthenticatedUrlFor,
} from './request';
export type {
  ClientEnvironment,
  ClientFailure,
  ClientResult,
  ClientSuccess,
  FailureKind,
  NotConfigured,
  QueryValue,
  RequestOptions,
  TutorClient,
} from './request';
export * from './validation';
export * from './bands';
export * from './dashboard';
export * from './copy';
export * from './format';
export * from './misconceptions';
export * from './legal';
