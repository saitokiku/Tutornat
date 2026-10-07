// A room, or a cohort of rooms: the object the whole business now revolves
// around, and the one the design system had no noun for.
//
// It was hand-drawn five different ways — in DropInSessions, ScheduleBrowser,
// TutorClasses, dn/Thread and the admin console — and each drawing made its own
// decision about what a room even is. Consequences reached customers: the
// Director's console badged every $550 seat room "Clinic", and no drawing
// anywhere carried a venue.
//
// THE HIERARCHY IS THE POINT (docs/superpowers/specs/2026-09-02-wave2-geometry.md).
// A parent's question order is *when and where* → *who* → *what it costs*, so
// this card puts the day and time first in mono, the venue directly under it,
// the person after that, and the price last and quietest. Inverting that — a
// price in the loudest slot with the time as grey 12px underneath — is what the
// old cards did, and it is what makes a local club read like a checkout.

import Card from '@/components/ui/Card';
import KindBadge from '@/components/ui/KindBadge';
import VenueLine from '@/components/ui/VenueLine';
import { roomWhen, cohortPattern } from '@/lib/roomTime';

/**
 * @param {object}  props
 * @param {string}  props.kind          room kind, for the badge and the label
 * @param {string}  [props.title]       what this room is about
 * @param {string}  [props.start]       ISO instant, for a single occasion
 * @param {string}  [props.timezone]    the ROOM's zone — never the reader's
 * @param {Array}   [props.slots]       [{weekday, localStartTime}] for a cohort
 * @param {string}  [props.venue]
 * @param {string}  [props.tutorName]
 * @param {string}  [props.price]       already formatted by the caller from clubPricing
 * @param {number}  [props.placesLeft]
 * @param {number}  [props.capacity]
 * @param {ReactNode} [props.action]    the one thing to do, or nothing
 * @param {ReactNode} [props.note]      a state sentence: reserved, full, held
 */
export default function RoomCard({
  kind,
  title = null,
  start = null,
  timezone = null,
  slots = null,
  venue = null,
  tutorName = null,
  price = null,
  placesLeft = null,
  capacity = null,
  action = null,
  note = null,
  className = '',
}) {
  // A cohort states its pattern ("Tuesdays and Thursdays, 6:00 PM"); a single
  // room states its occasion ("Thu 6:00 PM"). Both in the room's own zone,
  // which is the bug this whole primitive was built after.
  const when = Array.isArray(slots) && slots.length
    ? cohortPattern(slots)
    : roomWhen(start, timezone);

  return (
    <Card pad="md" className={className}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <KindBadge kind={kind} />
          {/* When, first and in mono: it is a fact you could check, and it is
              the reason a family opens this card at all. */}
          {when && <p className="font-opmono text-t3 tabular-nums mt-2">{when}</p>}
          {title && <p className="text-sm text-ink mt-1">{title}</p>}
          <VenueLine venue={venue} className="mt-1" />
          {tutorName && (
            <p className="text-xs text-muted mt-1">
              {/* Named, because "a real tutor" is not an answer to "who will
                  teach my child" for a $550 in-person commitment. */}
              with {tutorName}
            </p>
          )}
        </div>

        <div className="shrink-0 text-right">
          {price && <p className="font-opmono text-sm tabular-nums text-ink">{price}</p>}
          {Number.isFinite(placesLeft) && (
            <p className="font-opmono text-xs tabular-nums text-muted mt-1">
              {placesLeft > 0
                ? `${placesLeft} of ${capacity || placesLeft} left`
                : 'Full'}
            </p>
          )}
        </div>
      </div>

      {note && <p className="text-xs text-muted mt-3">{note}</p>}
      {action && <div className="mt-3">{action}</div>}
    </Card>
  );
}
