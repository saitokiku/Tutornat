import { PARENT_API } from '@/lib/tutor/contracts';
import type {
  BillingActionRequest,
  BillingActionResponse,
  BillingStatusResponse,
  CreateConsentRequest,
  CreateConsentResponse,
  CreateLearnerRequest,
  CreateLearnerResponse,
  DataDeleteRequest,
  DataDeleteResponse,
  DataExportResponse,
  DeleteLearnerRequest,
  DeleteLearnerResponse,
  ListConsentsResponse,
  ListLearnersResponse,
  ReportResponse,
  RevokeConsentRequest,
  RevokeConsentResponse,
  SettingsResponse,
  TranscriptsResponse,
  UpdateLearnerRequest,
  UpdateLearnerResponse,
  UpdateSettingsRequest,
  UpdateSettingsResponse,
} from '@/lib/tutor/wire';

import { client, type ClientResult } from './request';

export function listLearners(): Promise<ClientResult<ListLearnersResponse>> {
  return client.get<ListLearnersResponse>(PARENT_API.learners);
}

export function createLearner(
  body: CreateLearnerRequest,
): Promise<ClientResult<CreateLearnerResponse>> {
  return client.post<CreateLearnerResponse>(PARENT_API.learners, body);
}

export function updateLearner(
  body: UpdateLearnerRequest,
): Promise<ClientResult<UpdateLearnerResponse>> {
  return client.patch<UpdateLearnerResponse>(PARENT_API.learners, body);
}

export function deleteLearner(
  body: DeleteLearnerRequest,
): Promise<ClientResult<DeleteLearnerResponse>> {
  return client.del<DeleteLearnerResponse>(PARENT_API.learners, body);
}

export function getReport(learnerId: string): Promise<ClientResult<ReportResponse>> {
  return client.get<ReportResponse>(PARENT_API.report, { learnerId });
}

export function getTranscripts(
  learnerId: string,
  sessionId?: string,
): Promise<ClientResult<TranscriptsResponse>> {
  return client.get<TranscriptsResponse>(PARENT_API.transcripts, { learnerId, sessionId });
}

export function getBilling(): Promise<ClientResult<BillingStatusResponse>> {
  return client.get<BillingStatusResponse>(PARENT_API.billing);
}

export function billingAction(
  body: BillingActionRequest,
): Promise<ClientResult<BillingActionResponse>> {
  return client.post<BillingActionResponse>(PARENT_API.billing, body);
}

export function listConsents(learnerId?: string): Promise<ClientResult<ListConsentsResponse>> {
  return client.get<ListConsentsResponse>(PARENT_API.consent, { learnerId });
}

export function createConsent(
  body: CreateConsentRequest,
): Promise<ClientResult<CreateConsentResponse>> {
  return client.post<CreateConsentResponse>(PARENT_API.consent, body);
}

export function revokeConsent(
  body: RevokeConsentRequest,
): Promise<ClientResult<RevokeConsentResponse>> {
  return client.del<RevokeConsentResponse>(PARENT_API.consent, body);
}

export function getSettings(): Promise<ClientResult<SettingsResponse>> {
  return client.get<SettingsResponse>(PARENT_API.settings);
}

export function updateSettings(
  body: UpdateSettingsRequest,
): Promise<ClientResult<UpdateSettingsResponse>> {
  return client.patch<UpdateSettingsResponse>(PARENT_API.settings, body);
}

export function exportData(learnerId: string): Promise<ClientResult<DataExportResponse>> {
  return client.get<DataExportResponse>(PARENT_API.data, { learnerId });
}

export function deleteData(body: DataDeleteRequest): Promise<ClientResult<DataDeleteResponse>> {
  return client.post<DataDeleteResponse>(PARENT_API.data, body);
}
