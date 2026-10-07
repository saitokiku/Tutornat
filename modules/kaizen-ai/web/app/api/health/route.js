import { cloudConfigured } from '@/lib/server/context';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET() {
  return Response.json({
    status: 'ok',
    version: '0.5.0',
    ai: Boolean(process.env.ANTHROPIC_API_KEY),       // Claude — all text intelligence
    voice: Boolean(process.env.OPENAI_API_KEY),        // OpenAI — STT (Whisper) + TTS
    db: cloudConfigured,
    billing: Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET),
    email: Boolean(process.env.RESEND_API_KEY),
  });
}
