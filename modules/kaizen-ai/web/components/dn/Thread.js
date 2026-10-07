// The Thread: the brand's bridge graphic. One continuous rail (the companion,
// always there: in class, at home, before the test) with the week's scheduled
// sessions resting on it as chips (the tutors, on the schedule). Role-based,
// never time-of-day-based: the rail has no clock.
//
// Server component. Real rows come from publicSchedule so the story and the
// storefront can never disagree. state: 'live' | 'held' | 'empty'.
//
// The state branch is load-bearing, not cosmetic: in 'live' the price is a Link
// into /schedule; in 'held' and 'empty' it is a plain span, because a held
// surface exposes zero booking affordances.
//
// TIME AND PLACE COME FROM THE ROOM, NEVER FROM THE READER. This component used
// to format with toLocaleDateString/toLocaleTimeString and no zone, and it is a
// server component, so on Vercel — where the server runs in UTC — a 6:00 PM
// Austin room was rendered to every visitor as "Tue 11:00 PM". The rail sits on
// the landing page, on /ai and on /tutoring, so that was three storefronts
// telling a family the wrong evening. `roomTime.js` takes the room's own zone
// as an argument for exactly this reason.
import Link from 'next/link';
import GlowLine from '@/components/dn/GlowLine';
import { roomWhen } from '@/lib/roomTime';
import { kindLabel } from '@/lib/roomKinds';

function price(s) {
  return s.seatPriceCents === 0 ? 'Free' : `$${Math.round(s.seatPriceCents / 100)}`;
}

// Illustrative anchors for the EMPTY state: kinds only, no fabricated
// times/tutors; the caption below labels them. Derived from the one kind map
// rather than retyped, because retyping it is how the same room came to be
// called three different things on three different pages. The seat is absent
// on purpose — it is reserved inventory, not something the rail invites you to
// come and drop in on.
const ILLUSTRATIVE = ['homework_hall', 'clinic', 'community_free'].map((k) => kindLabel(k));

export default function Thread({ sessions = [], state = 'held', tone = 'day', className = '' }) {
  const night = tone === 'night';
  const rows = sessions.slice(0, 5);
  const illustrative = rows.length === 0;
  const chips = illustrative ? ILLUSTRATIVE : rows.slice(0, 3).map((s) => kindLabel(s.kind));

  // Two readings of the same rail, so the annotations sit above it rather than
  // knocking a hole in it: what is always on (accent, the mark) and what is
  // scheduled (muted, the operations).
  const alwaysCls = night ? 'text-ember' : 'text-accent';
  const quiet = night ? 'text-nightmuted' : 'text-muted';
  // Real kinds read as paper chips; illustrative ones stay inset, so the empty
  // state never dresses a placeholder up as a booked week.
  const chipCls = illustrative
    ? (night ? 'bg-coal2 border-nightline text-nightmuted' : 'bg-panel2 border-border text-muted')
    : (night ? 'bg-coal2 border-nightline text-paper' : 'bg-panel border-border text-ink shadow-soft');

  return (
    <div className={className}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between sm:gap-8">
        <p className={`text-xs font-medium ${alwaysCls}`}>Always: the companion</p>
        <div className="sm:text-right">
          <p className={`text-xs ${quiet}`}>Scheduled: real tutors</p>
          <div className="mt-2 flex flex-wrap gap-1.5 sm:justify-end">
            {chips.map((label, i) => (
              <span
                key={i}
                className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium whitespace-nowrap ${chipCls}`}
              >
                {label}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* The rail the chips rest on. */}
      <GlowLine className="mt-5" />

      {/* The week, as operations: time and price are the record, so they are
          the only things set in mono. */}
      {rows.length > 0 ? (
        <ul className={`mt-5 divide-y ${night ? 'divide-nightline' : 'divide-border'}`}>
          {rows.map((s) => (
            <li key={s.id} className="grid grid-cols-[auto_1fr_auto] items-baseline gap-x-4 sm:gap-x-6 py-2.5">
              {/* The row's key is recessed, but never below AA: muted is 5.3:1
                  on paper, nightmuted 6.1:1 on coal. */}
              <span className={`font-opmono text-xs whitespace-nowrap ${quiet}`}>{roomWhen(s.start, s.timezone)}</span>
              <span className={`text-sm min-w-0 ${night ? 'text-paper' : 'text-ink'}`}>
                <span className="block truncate">{s.topic || s.subject || kindLabel(s.kind)}</span>
                {/* Where, on the row itself. This is an in-person club, so the
                    address is half the answer; a room with no venue set yet
                    simply says nothing rather than showing a family a blank. */}
                {s.venue ? <span className={`block truncate text-xs ${quiet}`}>{s.venue}</span> : null}
              </span>
              {state === 'live' ? (
                <Link
                  href="/schedule"
                  className={`font-opmono text-sm font-semibold underline-offset-4 hover:underline ${night ? 'text-ember' : 'text-accent'}`}
                >
                  {price(s)}
                </Link>
              ) : (
                <span className={`font-opmono text-sm ${quiet}`}>{price(s)}</span>
              )}
            </li>
          ))}
        </ul>
      ) : (
        // This line is the ONLY thing telling a visitor the chips above are
        // kinds and not a real week, so it is load-bearing disclosure, not
        // decoration: it has to clear AA in both tones. ink/45 (2.8:1) and
        // paper/40 (3.7:1) did not; muted and nightmuted do.
        <p className={`mt-5 text-sm max-w-prose ${quiet}`}>
          {state === 'live'
            ? 'New sessions post through the week.'
            : 'No live times yet: these are the kinds of session we run. Days, times, and prices post here when booking opens.'}
        </p>
      )}
    </div>
  );
}
