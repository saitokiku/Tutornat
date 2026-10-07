/**
 * The planner (D35): what is due and what to do next. Four calls on one
 * path; the learner comes from the principal, never from the body.
 */
import { TUTOR_API } from '@/lib/tutor/contracts';
import type {
  CreatePlannerItemRequest,
  DeletePlannerItemRequest,
  ListPlannerResponse,
  PlannerItemResponse,
  UpdatePlannerItemRequest,
} from '@/lib/tutor/wire';

import { client, type ClientResult } from './request';

export function list(): Promise<ClientResult<ListPlannerResponse>> {
  return client.get<ListPlannerResponse>(TUTOR_API.planner);
}

export function create(body: CreatePlannerItemRequest): Promise<ClientResult<PlannerItemResponse>> {
  return client.post<PlannerItemResponse>(TUTOR_API.planner, body);
}

export function update(body: UpdatePlannerItemRequest): Promise<ClientResult<PlannerItemResponse>> {
  return client.patch<PlannerItemResponse>(TUTOR_API.planner, body);
}

export function remove(
  body: DeletePlannerItemRequest,
): Promise<ClientResult<Record<string, unknown>>> {
  return client.del<Record<string, unknown>>(TUTOR_API.planner, body);
}
