/**
 * Guest mode (D35): the free tutor with no account. `startGuest` creates the
 * anonymous account and learner behind the session cookie (or re-levels the
 * one the cookie already names) and, when a topic is given, starts the first
 * session in the same call. `forgetGuest` deletes every row behind the cookie
 * and clears it. Neither call bounces to sign-in on a 401: a guest has no
 * sign-in to go to, and the landing page handles the answer inline.
 */
import { TUTOR_API } from '@/lib/tutor/contracts';
import type { GuestForgetResponse, GuestStartRequest, GuestStartResponse } from '@/lib/tutor/wire';

import { client, type ClientResult } from './request';

const INLINE = { redirectOnUnauthenticated: false } as const;

export function startGuest(body: GuestStartRequest): Promise<ClientResult<GuestStartResponse>> {
  return client.post<GuestStartResponse>(TUTOR_API.guest, body, INLINE);
}

export function forgetGuest(): Promise<ClientResult<GuestForgetResponse>> {
  return client.post<GuestForgetResponse>(TUTOR_API.guestForget, {}, INLINE);
}
