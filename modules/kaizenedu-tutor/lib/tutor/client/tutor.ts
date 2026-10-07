import { TUTOR_API } from '@/lib/tutor/contracts';
import type {
  CourseworkItemResponse,
  CreateCourseworkRequest,
  CreateSessionRequest,
  CreateSessionResponse,
  DeleteCourseworkRequest,
  GetSessionResponse,
  ListCourseworkResponse,
  ProblemExtractResponse,
  ProgressResponse,
  SupportRequest,
  SupportResponse,
  UpdateCourseworkRequest,
} from '@/lib/tutor/wire';

import { client, type ClientResult } from './request';

export function createSession(
  body: CreateSessionRequest,
): Promise<ClientResult<CreateSessionResponse>> {
  return client.post<CreateSessionResponse>(TUTOR_API.session, body);
}

export function getSession(id: string): Promise<ClientResult<GetSessionResponse>> {
  return client.get<GetSessionResponse>(TUTOR_API.session, { id });
}

export function listCoursework(): Promise<ClientResult<ListCourseworkResponse>> {
  return client.get<ListCourseworkResponse>(TUTOR_API.coursework);
}

export function createCoursework(
  body: CreateCourseworkRequest,
): Promise<ClientResult<CourseworkItemResponse>> {
  return client.post<CourseworkItemResponse>(TUTOR_API.coursework, body);
}

export function updateCoursework(
  body: UpdateCourseworkRequest,
): Promise<ClientResult<CourseworkItemResponse>> {
  return client.patch<CourseworkItemResponse>(TUTOR_API.coursework, body);
}

export function deleteCoursework(
  body: DeleteCourseworkRequest,
): Promise<ClientResult<Record<string, unknown>>> {
  return client.del<Record<string, unknown>>(TUTOR_API.coursework, body);
}

/** Multipart `file` plus optional `title` (spec R3). The bytes go straight to the route. */
export function extractProblem(
  file: File,
  title?: string,
): Promise<ClientResult<ProblemExtractResponse>> {
  const formData = new FormData();
  formData.set('file', file, file.name);
  if (title && title.trim()) formData.set('title', title.trim());
  return client.upload<ProblemExtractResponse>(TUTOR_API.problemExtract, formData);
}

export function getProgress(): Promise<ClientResult<ProgressResponse>> {
  return client.get<ProgressResponse>(TUTOR_API.progress);
}

/** The support inbox; shown inline when signed out rather than bounced to sign-in. */
export function sendSupportRequest(body: SupportRequest): Promise<ClientResult<SupportResponse>> {
  return client.post<SupportResponse>(TUTOR_API.support, body, {
    redirectOnUnauthenticated: false,
  });
}
