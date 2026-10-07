/** @type {import('next').NextConfig} */

// Conservative starter CSP. 'unsafe-inline'/'unsafe-eval' in script-src are
// required by Next.js (inline bootstrap + dev refresh); connect-src covers
// Supabase (auth/DB/realtime) and the analytics/monitoring endpoints the
// browser may talk to. Server-side calls (Anthropic, OpenAI, Stripe, Resend)
// don't need CSP entries but are harmless to allow if ever called client-side.
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.daily.co wss://*.daily.co https://api.anthropic.com https://api.openai.com https://api.stripe.com https://api.resend.com https://*.posthog.com https://*.sentry.io",
  "media-src 'self' blob:",
  "frame-src https://js.stripe.com https://checkout.stripe.com https://*.daily.co",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self' https://checkout.stripe.com https://billing.stripe.com",
].join('; ');

const securityHeaders = [
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Content-Security-Policy', value: csp },
];

const nextConfig = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },
};

module.exports = nextConfig;
