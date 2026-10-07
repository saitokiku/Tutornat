/**
 * The public origin of this deployment, for links that leave the product:
 * Stripe's return URLs and every emailed link. `APP_URL` when the operator set
 * it, else the origin of the request that is asking — which is right on the
 * custom domain and on a preview alike, and wrong only for a job with no
 * request (the weekly cron), which is why `APP_URL` exists.
 */
export function resolveAppUrl(request: Request, env: NodeJS.ProcessEnv = process.env): string {
  const configured = env.APP_URL?.trim();
  if (configured) return configured.replace(/\/+$/, '');
  return new URL(request.url).origin;
}
