// GET /api/tutoring/directory            → active tutors + avg rating (public)
// GET /api/tutoring/directory?slug=<s>    → one tutor + reviews + open slots
// Public, unauthenticated — powers the marketing directory. Uses the service
// client for a clean join but only ever returns public-safe fields.

import { serviceClient, getSettings } from '@/lib/server/context';
import { checkRate, rateKey } from '@/lib/server/ratelimit';
import { RETAIL } from '@/lib/server/clubPricing';

export const runtime = 'nodejs';
// Always reflect live tutors + read the ?slug param at request time; never
// cache the build-time (empty) response.
export const dynamic = 'force-dynamic';

function withRatings(tutors, reviews) {
  const byTutor = {};
  for (const r of reviews || []) {
    (byTutor[r.tutor_id] ||= []).push(r);
  }
  return tutors.map((t) => {
    const rs = byTutor[t.id] || [];
    const avg = rs.length ? rs.reduce((s, r) => s + r.rating, 0) / rs.length : null;
    return {
      // House pricing: sessions cost the same with every tutor (clubPricing.js),
      // so no per-tutor rate is published — the pay a tutor receives is between
      // Kaizen and the tutor.
      id: t.id, slug: t.slug, display_name: t.display_name, headline: t.headline,
      bio: t.bio, subjects: t.subjects || [],
      photo_url: t.photo_url,
      rating: avg == null ? null : Math.round(avg * 10) / 10, reviewCount: rs.length,
    };
  });
}

export async function GET(req) {
  // Public + unauthenticated → rate-limit by IP so it can't be hammered
  // (audit: this endpoint had no limiter and loaded all tutors + reviews).
  const rl = await checkRate(rateKey(null, req, 'dir'), { limit: 60, windowMs: 60_000 });
  if (!rl.ok) {
    return Response.json({ error: 'Too many requests — try again shortly.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } });
  }

  // Listing and booking must agree. The booking routes fail closed on
  // app_settings.club_enabled, and this public directory gates on the same
  // switch — the moment a tutor is activated while selling is still gated, the
  // directory must not advertise a bookable person whose Book button returns
  // 503. Gating here keeps the honest "first tutors are being onboarded" state
  // the page already renders, until the club genuinely opens.
  const settings = await getSettings();
  if (settings.club_enabled !== true) {
    return Response.json({ tutors: [], notYetOpen: true });
  }

  const svc = serviceClient();
  if (!svc) return Response.json({ tutors: [] });

  const slug = new URL(req.url).searchParams.get('slug');

  if (slug) {
    const { data: t } = await svc.from('tutors').select('*').eq('slug', slug).eq('status', 'active').eq('vetting_status', 'cleared').maybeSingle();
    if (!t) return Response.json({ error: 'Tutor not found.' }, { status: 404 });
    const [reviewsQ, slotsQ] = await Promise.all([
      svc.from('tutor_reviews').select('rating,comment,created_at').eq('tutor_id', t.id).order('created_at', { ascending: false }).limit(10),
      svc.from('tutor_availability').select('id,start_at,end_at').eq('tutor_id', t.id).eq('status', 'open').gt('start_at', new Date().toISOString()).order('start_at').limit(8),
    ]);
    const [tutor] = withRatings([t], reviewsQ.data || []);
    return Response.json({ tutor, reviews: reviewsQ.data || [], openSlots: slotsQ.data || [], pricing: { ...RETAIL } });
  }

  // Public directory lists only active AND vetted tutors — the same hard gate
  // enforced at booking time (child-safety requirement, not just UX).
  const { data: tutors } = await svc.from('tutors').select('*').eq('status', 'active').eq('vetting_status', 'cleared').order('created_at').limit(200);
  const ids = (tutors || []).map((t) => t.id);
  const { data: reviews } = ids.length
    ? await svc.from('tutor_reviews').select('tutor_id,rating').in('tutor_id', ids).limit(2000)
    : { data: [] };
  return Response.json({ tutors: withRatings(tutors || [], reviews || []), pricing: { ...RETAIL } });
}
