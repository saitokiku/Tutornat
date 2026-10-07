import { AUTH_API } from '@/lib/tutor/contracts';
import type {
  AcceptParentInviteRequest,
  AcceptParentInviteResponse,
  MeResponse,
  ParentInviteResponse,
  RequestPasswordResetRequest,
  RequestPasswordResetResponse,
  ResetPasswordRequest,
  ResetPasswordResponse,
  SelectLearnerRequest,
  SelectLearnerResponse,
  SignInRequest,
  SignInResponse,
  SignUpRequest,
  SignUpResponse,
  TeenInviteRequest,
  TeenInviteResponse,
  TeenSignInRequest,
  TeenSignInResponse,
} from '@/lib/tutor/wire';

import { client, type ClientResult } from './request';

/** The auth forms show a 401 inline instead of bouncing to sign-in. */
const INLINE = { redirectOnUnauthenticated: false } as const;

export function signUp(body: SignUpRequest): Promise<ClientResult<SignUpResponse>> {
  return client.post<SignUpResponse>(AUTH_API.signUp, body, INLINE);
}

export function signIn(body: SignInRequest): Promise<ClientResult<SignInResponse>> {
  return client.post<SignInResponse>(AUTH_API.signIn, body, INLINE);
}

export function teenSignIn(body: TeenSignInRequest): Promise<ClientResult<TeenSignInResponse>> {
  return client.post<TeenSignInResponse>(AUTH_API.teenSignIn, body, INLINE);
}

export function requestPasswordReset(
  body: RequestPasswordResetRequest,
): Promise<ClientResult<RequestPasswordResetResponse>> {
  return client.post<RequestPasswordResetResponse>(AUTH_API.passwordResetRequest, body, INLINE);
}

export function resetPassword(
  body: ResetPasswordRequest,
): Promise<ClientResult<ResetPasswordResponse>> {
  return client.post<ResetPasswordResponse>(AUTH_API.passwordReset, body, INLINE);
}

export function teenInvite(body: TeenInviteRequest): Promise<ClientResult<TeenInviteResponse>> {
  return client.post<TeenInviteResponse>(AUTH_API.teenInvite, body, INLINE);
}

export function parentInvite(token: string): Promise<ClientResult<ParentInviteResponse>> {
  return client.get<ParentInviteResponse>(AUTH_API.parentInvite, { t: token });
}

export function acceptParentInvite(
  body: AcceptParentInviteRequest,
): Promise<ClientResult<AcceptParentInviteResponse>> {
  return client.post<AcceptParentInviteResponse>(AUTH_API.parentInviteAccept, body, INLINE);
}

export function me(): Promise<ClientResult<MeResponse>> {
  return client.get<MeResponse>(AUTH_API.me);
}

export function selectLearner(
  body: SelectLearnerRequest,
): Promise<ClientResult<SelectLearnerResponse>> {
  return client.post<SelectLearnerResponse>(AUTH_API.selectLearner, body);
}

export function signOut(): Promise<ClientResult<Record<string, never>>> {
  return client.post<Record<string, never>>(AUTH_API.signOut, {}, INLINE);
}
