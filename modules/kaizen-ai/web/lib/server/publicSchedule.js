// The PUBLIC weekly schedule — sanitized, unauthenticated view of upcoming
// rooms. Shared by /api/club/schedule (the browser island refetches it) and
// the landing page's server-rendered "Happening today" strip, so the two can
// never disagree about what's on.
//
// Only public-safe fields leave this function: no student data, no seat
// holders, no tutor pay. Retail prices only — personal quotes (member pricing,
// included visits) come from the authenticated group route.

import { serviceClient, getSettings } from '@/lib/server/context';
import { herdingCompare } from '@/lib/server/occupancy';
import { kindLabel } from '@/lib/roomKinds';

// What a walk-in family may filter the board by. Deliberately an allowlist and
// not `ROOM_KINDS`: the seat is a real kind with a real label, and it is
// excluded from this board below, so accepting `kind=standing_seat` here would
// answer a query with an empty week instead of refusing it.
const PUBLIC_KINDS = ['clinic', 'homework_hall', 'community_free'];
const HELD = ['pending_payment', 'booked', 'attended'];

export async function publicSchedule({ days = 7, kind = null, grade = null } = {}) {
  const svc = serviceClient();
  // Fail CLOSED: a storefront that cannot read app_settings must present the
  // held state, never a fake-live one with booking CTAs that 503.
  if (!svc) return { sessions: [], notYetOpen: true };

  const settings = await getSettings();
  // Preview mode: while selling is held (club_enabled=false) the storefront
  // still SHOWS the real week, it just can't sell it. Booking routes keep
  // their own hard gate (fail closed), so this exposes zero purchase paths;
  // the UI renders notYetOpen rows with interest capture instead of booking.
  const notYetOpen = settings.club_enabled !== true;

  const now = new Date();
  const horizon = new Date(now.getTime() + days * 24 * 3600 * 1000);

  let q = svc.from('group_session')
    .select('id,tutor_id,subject,topic,description,kind,grade_band,capacity,min_seats,seat_price_cents,scheduled_start,scheduled_end,status,timezone,venue')
    .in('status', ['open', 'confirmed'])
    // Standing-seat rooms are reserved inventory (clubPricing 'reserved' mode),
    // not a public offer; the board shows what a walk-in family can book.
    .neq('kind', 'standing_seat')
    .gt('scheduled_start', now.toISOString())
    .lt('scheduled_start', horizon.toISOString())
    .order('scheduled_start', { ascending: true })
    .limit(100);
  if (kind && PUBLIC_KINDS.includes(kind)) q = q.eq('kind', kind);
  if (grade) q = q.in('grade_band', [grade, 'all']);
  const { data: rooms, error } = await q;
  // A failed read is NOT a quiet week. Swallowing it returned sessions:[] with
  // a 200, which every storefront renders as "the schedule opens here soon" —
  // so a Postgres timeout, an RLS refusal or a role failure looked exactly like
  // a business that has not opened, for as long as it lasted, with nothing in
  // Sentry and nothing a synthetic check would notice. `failed` lets the API
  // answer 503 and the board say it could not read rather than that there is
  // nothing to read.
  if (error) {
    console.error('[publicSchedule] room read failed:', error.message);
    return { sessions: [], notYetOpen, failed: true };
  }
  if (!rooms?.length) return { sessions: [], notYetOpen };

  // Same hard gate as everywhere: only vetted, active tutors are visible.
  const tutorIds = [...new Set(rooms.map((r) => r.tutor_id))];
  const { data: tutors } = await svc.from('tutors')
    .select('id,display_name,status,vetting_status')
    .in('id', tutorIds);
  const bookable = Object.fromEntries(
    (tutors || [])
      .filter((t) => t.status === 'active' && t.vetting_status === 'cleared')
      .map((t) => [t.id, t])
  );

  const ids = rooms.map((r) => r.id);
  const [{ data: seats }, { data: staffRows }] = await Promise.all([
    ids.length
      ? svc.from('group_seat').select('group_session_id,status').in('group_session_id', ids)
      : Promise.resolve({ data: [] }),
    // Co-tutors (0029): shown as a staff count — supervision is a selling
    // point for the free community hall, and capacity derives from it.
    ids.length
      ? svc.from('group_session_staff').select('group_session_id,tutor_id').in('group_session_id', ids)
      : Promise.resolve({ data: [] }),
  ]);
  const taken = {};
  for (const s of seats || []) {
    if (HELD.includes(s.status)) taken[s.group_session_id] = (taken[s.group_session_id] || 0) + 1;
  }
  const coStaff = {};
  for (const s of staffRows || []) {
    coStaff[s.group_session_id] = (coStaff[s.group_session_id] || 0) + 1;
  }

  return {
    notYetOpen,
    // A FULL room stays on the storefront as "Full — join the list" instead of
    // vanishing (0029): a room that disappears takes its demand with it, and
    // the waitlist is what feeds density when a seat frees up. Ordering is the
    // herding sort: by local day, fullest bookable room first.
    sessions: rooms
      .filter((r) => bookable[r.tutor_id])
      .map((r) => {
        const filled = taken[r.id] || 0;
        return {
          id: r.id,
          subject: r.subject,
          topic: r.topic,
          kind: r.kind,
          kindLabel: kindLabel(r.kind),
          gradeBand: r.grade_band,
          start: r.scheduled_start,
          end: r.scheduled_end,
          timezone: r.timezone,
          // Where the room is. The column has existed since 0033 and travelled
          // onto every instance since Wave 1, and this select is the reason no
          // public surface could ever say it: an in-person club's storefront
          // could not answer the parent's first question.
          venue: r.venue || null,
          seatPriceCents: r.seat_price_cents,
          capacity: r.capacity,
          seatsLeft: Math.max(0, r.capacity - filled),
          isFull: filled >= r.capacity,
          staffCount: 1 + (coStaff[r.id] || 0),
          tutorName: bookable[r.tutor_id].display_name,
        };
      })
      .sort(herdingCompare),
  };
}
