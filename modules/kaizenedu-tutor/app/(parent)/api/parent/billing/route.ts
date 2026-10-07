/**
 * GET /api/parent/billing → BillingStatusResponse.
 * POST /api/parent/billing { action: 'checkout' | 'portal' } → { url }.
 * Account holders only (parent or adult). 409 BILLING_NOT_ENABLED carries the
 * reason when the operator gate is shut or the Stripe keys are missing (D19).
 */
import { apiError, apiSuccess } from '@/lib/server/api-response';
import { track } from '@/lib/tutor/analytics';
import { dbNotConfiguredResponse, requirePrincipal } from '@/lib/tutor/auth/principal';
import {
  createCheckoutSession,
  createPortalSession,
  resolveAppUrl,
} from '@/lib/tutor/billing/checkout';
import { billingGate, getBillingStatus } from '@/lib/tutor/billing/status';
import { getStripe, stripeConfig } from '@/lib/tutor/billing/stripe';
import { DbNotConfiguredError, getTutorDb } from '@/lib/tutor/db';
import { reportError } from '@/lib/tutor/errors';
import { enforceRateLimit } from '@/lib/tutor/guards/rate-limit';
import type { BillingActionRequest, BillingActionResponse } from '@/lib/tutor/wire';

const ROUTE = '/api/parent/billing';
const ACCOUNT_HOLDERS = ['parent', 'adult'] as const;

export async function GET(request: Request) {
  const auth = await requirePrincipal(request, { role: [...ACCOUNT_HOLDERS] });
  if (!auth.ok) return auth.response;
  const { accountId } = auth.principal;
  try {
    const db = await getTutorDb();
    const status = await getBillingStatus(db, accountId);
    return apiSuccess({ ...status });
  } catch (error) {
    if (error instanceof DbNotConfiguredError) return dbNotConfiguredResponse();
    await reportError(error, { accountId, route: ROUTE, code: 'billing_status_failed' });
    return apiError('INTERNAL_ERROR', 500, 'Could not read the billing status.');
  }
}

export async function POST(request: Request) {
  const auth = await requirePrincipal(request, { role: [...ACCOUNT_HOLDERS] });
  if (!auth.ok) return auth.response;
  const { accountId } = auth.principal;
  const limited = enforceRateLimit(auth.principal, 'billing');
  if (limited) return limited;

  let body: Partial<BillingActionRequest>;
  try {
    body = (await request.json()) as Partial<BillingActionRequest>;
  } catch {
    return apiError('INVALID_REQUEST', 400, 'The request body must be JSON.');
  }
  const action = body.action;
  if (action !== 'checkout' && action !== 'portal') {
    return apiError('INVALID_REQUEST', 400, "action must be 'checkout' or 'portal'.");
  }

  try {
    const db = await getTutorDb();
    const gate = await billingGate(db);
    const stripe = getStripe();
    const { priceMonthly } = stripeConfig();
    if (!gate.enabled || !stripe || !priceMonthly) {
      return apiError('BILLING_NOT_ENABLED', 409, gate.reason ?? 'Billing is not enabled.');
    }
    const appUrl = resolveAppUrl(request);
    const url =
      action === 'checkout'
        ? await createCheckoutSession(db, stripe, { accountId, priceId: priceMonthly, appUrl })
        : await createPortalSession(db, stripe, { accountId, appUrl });
    await track('upgrade', { accountId, action, source: 'route' });
    const payload: BillingActionResponse = { url };
    return apiSuccess({ ...payload });
  } catch (error) {
    if (error instanceof DbNotConfiguredError) return dbNotConfiguredResponse();
    await reportError(error, { accountId, route: ROUTE, code: `billing_${action}_failed` });
    return apiError('UPSTREAM_ERROR', 502, 'Stripe did not answer. Try again in a moment.');
  }
}
