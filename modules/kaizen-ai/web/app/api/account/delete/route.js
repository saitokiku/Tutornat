// POST /api/account/delete — full account + data deletion.
// Service-role cascade: auth.admin.deleteUser removes every FK-cascaded row
// (profiles, courses, documents, mastery, sessions, homework, subscriptions,
// handoffs, reports…). usage_ledger has no FK, so it's cleared explicitly.
// Any active Stripe subscription is cancelled best-effort first.
//
// What the cascade must NOT reach is other people's money. Until 0031 the
// chain auth.users → tutors → group_session → group_seat cascaded the whole
// way, so one tutor deleting their own account erased every room they had
// taught and every other family's seat in it — payment intents, refund status,
// the ledger Kaizen answers disputes with. 0031 stops that at the database
// (both FKs are ON DELETE RESTRICT), which on its own turns silent data loss
// into a raw FK error. hasSharedRecords below is the human half: say no first,
// in words, with a route out — support offboards the account (reassigns or
// cancels the rooms) and then deletes it.

import { getCaller, serviceClient, auditLog } from '@/lib/server/context';
import { getStripe } from '@/lib/server/stripe';

export const runtime = 'nodejs';

// Storage objects don't FK-cascade — walk the user's folder in each bucket
// (paths are <uid>/<file> or <uid>/<sub>/<file>, so two levels is exhaustive)
// and remove everything. Best-effort: DB deletion proceeds regardless.
async function purgeStorage(svc, userId) {
  for (const bucket of ['documents', 'applications', 'avatars']) {
    try {
      const paths = [];
      const { data: top } = await svc.storage.from(bucket).list(userId, { limit: 1000 });
      for (const entry of top || []) {
        if (entry.id) paths.push(`${userId}/${entry.name}`);              // a file
        else {
          const { data: inner } = await svc.storage.from(bucket).list(`${userId}/${entry.name}`, { limit: 1000 });
          for (const f of inner || []) paths.push(`${userId}/${entry.name}/${f.name}`);
        }
      }
      if (paths.length) await svc.storage.from(bucket).remove(paths);
    } catch { /* bucket may not exist on this deployment */ }
  }
}

// One message for every reason we refuse: the caller doesn't need our schema,
// they need to know a human has to unwind this and where to ask.
const OFFBOARD_MESSAGE =
  'This account is attached to tutoring records other people share — rooms you taught, '
  + 'or seats and sessions that were paid for. Deleting it would take their payment and '
  + 'refund history with it, so we do this by hand. Contact support to be offboarded '
  + '(we reassign or cancel what is outstanding) and we will finish the deletion for you.';

// Returns true when deletion must be refused. Two shapes:
//   (a) a tutor with any work behind them — rooms hosted, 1:1 sessions, or
//       accrued earnings. Their rows are other people's records too.
//   (b) an account holding settled money — a seat or session that was paid for
//       or actually happened. Cancelled/abandoned holds carry nothing and are
//       the account owner's to delete.
// Best-effort by design is NOT acceptable here: a count query that errors must
// not read as "nothing found", so a thrown error propagates to the 500 path.
async function hasSharedRecords(svc, userId) {
  // ANY tutor row is enough. 0031 made tutors.user_id ON DELETE RESTRICT, so a
  // tutor with a completely clean slate — a never-activated applicant, someone
  // pulled from the market before their first booking — still cannot be deleted
  // by GoTrue. Counting their sessions first would let that account through this
  // guard and into the destructive half below (storage purged, subscription
  // cancelled, audit row written) only to hit the FK wall at deleteUser and be
  // told to contact support, having already lost its files. Refuse up front: a
  // tutor account is offboarded by a human either way.
  const { data: tutor } = await svc.from('tutors').select('id').eq('user_id', userId).maybeSingle();
  if (tutor?.id) return true;

  // The payer side. booked_by as well as student_id: a parent who paid for a
  // teen's seat owns that payment record even though the seat isn't theirs.
  const mine = `student_id.eq.${userId},booked_by.eq.${userId}`;
  const [seats, sessions] = await Promise.all([
    svc.from('group_seat').select('id', { count: 'exact', head: true })
      .or(mine).or('paid.eq.true,status.in.(booked,attended)'),
    svc.from('tutoring_sessions').select('id', { count: 'exact', head: true })
      .or(mine).or('paid.eq.true,status.in.(scheduled,in_progress,completed)'),
  ]);
  for (const r of [seats, sessions]) {
    if (r.error) throw r.error;
    if ((r.count || 0) > 0) return true;
  }
  return false;
}

// A tutor with a clean slate still trips tutors.user_id RESTRICT, and the
// GoTrue admin API reports that as an opaque "Database error deleting user".
// Anything FK-shaped coming back from deleteUser means the same thing the
// pre-check means, so it gets the same answer instead of a generic 500.
function isForeignKeyRefusal(err) {
  if (!err) return false;
  if (err.code === '23503') return true;
  return /foreign key|violates foreign key|database error deleting user/i.test(err.message || '');
}

export async function POST(req) {
  const caller = await getCaller(req);
  if (!caller) return Response.json({ error: 'Sign in first.' }, { status: 401 });
  if (caller.demo) {
    return Response.json({ error: 'Demo mode stores nothing on a server — use the ↺ reset button to clear this browser.' }, { status: 501 });
  }
  const svc = serviceClient();
  if (!svc) return Response.json({ error: 'Database not configured.' }, { status: 501 });

  const userId = caller.user.id;
  const email = caller.user.email || '';

  try {
    // Refuse BEFORE anything is destroyed — the storage purge and the Stripe
    // cancel below are irreversible, and a deletion we can't finish must not
    // leave the account half-gone.
    if (await hasSharedRecords(svc, userId)) {
      return Response.json({ error: OFFBOARD_MESSAGE, needsOffboarding: true }, { status: 409 });
    }

    // Stop billing first (best-effort — deletion proceeds regardless)
    const stripe = getStripe();
    if (stripe) {
      const { data: sub } = await svc.from('subscriptions')
        .select('stripe_subscription_id').eq('user_id', userId).maybeSingle();
      if (sub?.stripe_subscription_id) {
        try { await stripe.subscriptions.cancel(sub.stripe_subscription_id); } catch { /* already gone */ }
      }
    }

    // Rows without FK cascade + uploaded files (résumés, documents, avatars)
    await svc.from('usage_ledger').delete().eq('user_id', userId);
    await purgeStorage(svc, userId);

    // Audit BEFORE the user disappears (audit_logs keeps actor_id as a plain uuid)
    await auditLog(userId, 'account.deleted', email, { requested_by: 'self' });

    // Cascade everything else
    const { error } = await svc.auth.admin.deleteUser(userId);
    if (error) {
      if (isForeignKeyRefusal(error)) {
        return Response.json({ error: OFFBOARD_MESSAGE, needsOffboarding: true }, { status: 409 });
      }
      throw error;
    }

    return Response.json({ ok: true });
  } catch (err) {
    console.error('[account/delete]', err?.message);
    if (isForeignKeyRefusal(err)) {
      return Response.json({ error: OFFBOARD_MESSAGE, needsOffboarding: true }, { status: 409 });
    }
    return Response.json({ error: 'Could not delete the account. Contact support and we will do it by hand.' }, { status: 500 });
  }
}
