// The badge itself. The map, the labels and the supervision/tutoring answer all
// live in lib/roomKinds.js, so a node test can pin them without a renderer and
// a server module can ask "is this taught?" without importing markup.
import { ROOM_KINDS, kindLabel } from '@/lib/roomKinds';

export { ROOM_KINDS, kindLabel };
export { isTaught } from '@/lib/roomKinds';

export default function KindBadge({ kind, short = false, className = '' }) {
  const k = ROOM_KINDS[kind];
  const tone = k?.tone || 'muted';
  return (
    <span className={`k-badge k-badge-${tone} ${className}`}>{kindLabel(kind, { short })}</span>
  );
}
