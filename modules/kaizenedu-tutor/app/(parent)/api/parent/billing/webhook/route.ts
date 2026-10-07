/**
 * POST /api/parent/billing/webhook — Stripe events. Authenticated by the
 * `stripe-signature` header against STRIPE_WEBHOOK_SECRET (raw body, Node
 * runtime), not by a cookie: Stripe has no session. Idempotent by event id.
 *
 * Staging note for the integrator: middleware.ts answers 401 to every /api/*
 * request without the ACCESS_CODE cookie, which Stripe cannot send; this path
 * needs a middleware exemption on staging (see docs/OPS-RUNBOOK.md).
 */
import type Stripe from 'stripe';

import { isTutorMode } from '@/kaizen.config';
import { apiError, apiSuccess } from '@/lib/server/api-response';
import { track } from '@/lib/tutor/analytics';
import { dbNotConfiguredResponse, notFoundResponse } from '@/lib/tutor/auth/principal';
import { getStripe, stripeConfig } from '@/lib/tutor/billing/stripe';
import { processStripeEvent } from '@/lib/tutor/billing/webhook';
import { DbNotConfiguredError, getTutorDb } from '@/lib/tutor/db';
import { reportError } from '@/lib/tutor/errors';

export const runtime = 'nodejs';

const ROUTE = '/api/parent/billing/webhook';

export async function POST(request: Request) {
  if (!isTutorMode()) return notFoundResponse();
  const stripe = getStripe();
  const { webhookSecret } = stripeConfig();
  if (!stripe || !webhookSecret) {
    return apiError(
      'BILLING_NOT_ENABLED',
      503,
      'The Stripe webhook is not configured: STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET are required.',
    );
  }
  const signature = request.headers.get('stripe-signature');
  if (!signature) return apiError('INVALID_REQUEST', 400, 'Missing stripe-signature header.');

  const payload = await request.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  } catch {
    return apiError('INVALID_REQUEST', 400, 'Webhook signature verification failed.');
  }

  try {
    const db = await getTutorDb();
    const outcome = await processStripeEvent(db, event);
    if (outcome.handled) {
      await track('upgrade', {
        accountId: outcome.accountId,
        action: outcome.status,
        source: 'webhook',
      });
    }
    return apiSuccess({
      received: true,
      eventId: event.id,
      handled: outcome.handled,
      ...(outcome.handled ? {} : { reason: outcome.reason }),
    });
  } catch (error) {
    if (error instanceof DbNotConfiguredError) return dbNotConfiguredResponse();
    await reportError(error, { route: ROUTE, code: 'stripe_webhook_failed' });
    return apiError('INTERNAL_ERROR', 500, 'Webhook handling failed; Stripe will retry.');
  }
}
