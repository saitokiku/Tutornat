// GET /api/tutor/earnings — a tutor's OWN earnings ledger, read from the
// authoritative tutor_earnings table (audit: the /tutor page recomputed this
// client-side and hardcoded paid:0, so tutors never saw what they'd been paid).

import { getCaller, serviceClient } from '@/lib/server/context';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req) {
  const caller = await getCaller(req);
  if (!caller) return Response.json({ error: 'Sign in first.' }, { status: 401 });
  const svc = serviceClient();
  if (!svc) return Response.json({ accruedCents: 0, paidCents: 0, isTutor: false });

  const { data: tutor } = await svc.from('tutors').select('id').eq('user_id', caller.user.id).maybeSingle();
  if (!tutor) return Response.json({ accruedCents: 0, paidCents: 0, isTutor: false });

  const { data: rows } = await svc.from('tutor_earnings')
    .select('amount_cents,status').eq('tutor_id', tutor.id).limit(5000);
  let accruedCents = 0, paidCents = 0;
  for (const r of rows || []) {
    if (r.status === 'paid') paidCents += r.amount_cents;
    else accruedCents += r.amount_cents;
  }
  return Response.json({ accruedCents, paidCents, isTutor: true, items: (rows || []).length });
}
